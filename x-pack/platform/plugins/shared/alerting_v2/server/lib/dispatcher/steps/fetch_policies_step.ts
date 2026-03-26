/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { NotificationPolicySavedObjectServiceContract } from '../../services/notification_policy_saved_object_service/notification_policy_saved_object_service';
import { NotificationPolicySavedObjectServiceInternalToken } from '../../services/notification_policy_saved_object_service/tokens';
import { savedObjectNamespacesToSpaceId } from '../../space_id_to_namespace';
import type {
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
  NotificationPolicy,
  NotificationPolicyId,
} from '../types';

@injectable()
export class FetchPoliciesStep implements DispatcherStep {
  public readonly name = 'fetch_policies';

  constructor(
    @inject(NotificationPolicySavedObjectServiceInternalToken)
    private readonly notificationPolicySavedObjectService: NotificationPolicySavedObjectServiceContract
  ) {}

  public async execute(_state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    const result = await this.notificationPolicySavedObjectService.findAllDecrypted({
      filter: { enabled: true },
    });

    const policies = new Map<NotificationPolicyId, NotificationPolicy>();

    for (const doc of result) {
      if ('error' in doc) {
        continue;
      }

      policies.set(doc.id, {
        id: doc.id,
        spaceId: savedObjectNamespacesToSpaceId(doc.namespaces),
        name: doc.attributes.name,
        enabled: doc.attributes.enabled,
        destinations: doc.attributes.destinations ?? [],
        matcher: doc.attributes.matcher ?? undefined,
        groupBy: doc.attributes.groupBy ?? [],
        throttle: doc.attributes.throttle ?? undefined,
        snoozedUntil: doc.attributes.snoozedUntil ?? null,
        apiKey: doc.attributes.auth.apiKey,
      });
    }

    return { type: 'continue', data: { policies } };
  }
}
