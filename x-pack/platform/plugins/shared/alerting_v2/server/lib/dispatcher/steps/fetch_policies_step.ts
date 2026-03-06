/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { nodeBuilder } from '@kbn/es-query';
import { inject, injectable } from 'inversify';
import type { NotificationPolicySavedObjectAttributes } from '../../../saved_objects';
import { NOTIFICATION_POLICY_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type {
  NotificationPolicy,
  NotificationPolicyId,
  DispatcherStep,
  DispatcherPipelineState,
  DispatcherStepOutput,
} from '../types';
import { EncryptedSavedObjectsClientToken } from './dispatch_step_tokens';

@injectable()
export class FetchPoliciesStep implements DispatcherStep {
  public readonly name = 'fetch_policies';

  constructor(
    @inject(EncryptedSavedObjectsClientToken)
    private readonly encryptedSavedObjectsClient: EncryptedSavedObjectsClient
  ) {}

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    const { rules } = state;
    if (!rules || rules.size === 0) {
      return { type: 'continue', data: { policies: new Map() } };
    }

    const uniquePolicyIds = Array.from(
      new Set(rules.values().flatMap((r) => r.notificationPolicyIds))
    );
    if (uniquePolicyIds.length === 0) {
      return { type: 'continue', data: { policies: new Map() } };
    }

    const filter = nodeBuilder.or(
      uniquePolicyIds.map((id) =>
        nodeBuilder.is(
          `${NOTIFICATION_POLICY_SAVED_OBJECT_TYPE}.id`,
          `${NOTIFICATION_POLICY_SAVED_OBJECT_TYPE}:${id}`
        )
      )
    );

    const finder =
      await this.encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<NotificationPolicySavedObjectAttributes>(
        {
          type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          filter,
        }
      );

    const policies = new Map<NotificationPolicyId, NotificationPolicy>();

    for await (const response of finder.find()) {
      for (const doc of response.saved_objects) {
        if (doc.error) {
          continue;
        }

        policies.set(doc.id, {
          id: doc.id,
          name: doc.attributes.name,
          destinations: doc.attributes.destinations ?? [],
          matcher: doc.attributes.matcher,
          groupBy: doc.attributes.group_by ?? [],
          throttle: doc.attributes.throttle,
          apiKey: doc.attributes.auth.apiKey,
        });
      }
    }

    await finder.close();

    return { type: 'continue', data: { policies } };
  }
}
