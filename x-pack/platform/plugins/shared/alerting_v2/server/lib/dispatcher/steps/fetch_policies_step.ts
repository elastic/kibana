/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type {
  NotificationPolicy,
  NotificationPolicyId,
  DispatcherStep,
  DispatcherPipelineState,
  DispatcherStepOutput,
} from '../types';
import type { NotificationPolicySavedObjectServiceContract } from '../../services/notification_policy_saved_object_service/notification_policy_saved_object_service';
import { NotificationPolicySavedObjectServiceInternalToken } from '../../services/notification_policy_saved_object_service/tokens';

@injectable()
export class FetchPoliciesStep implements DispatcherStep {
  public readonly name = 'fetch_policies';

  constructor(
    @inject(NotificationPolicySavedObjectServiceInternalToken)
    private readonly notificationPolicySavedObjectService: NotificationPolicySavedObjectServiceContract
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

    const result = await this.notificationPolicySavedObjectService.bulkGetByIds(uniquePolicyIds);
    const policies = new Map<NotificationPolicyId, NotificationPolicy>();

    for (const doc of result) {
      if ('error' in doc) continue;

      policies.set(doc.id, {
        id: doc.id,
        name: doc.attributes.name,
        destinations: doc.attributes.destinations ?? [],
        matcher: doc.attributes.matcher,
        groupBy: doc.attributes.group_by ?? [],
        throttle: doc.attributes.throttle,
      });
    }

    return { type: 'continue', data: { policies } };
  }
}
