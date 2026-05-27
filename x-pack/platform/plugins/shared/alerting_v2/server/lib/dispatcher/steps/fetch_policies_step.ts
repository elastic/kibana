/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { ActionPolicySavedObjectServiceContract } from '../../services/action_policy_saved_object_service/action_policy_saved_object_service';
import { ActionPolicySavedObjectServiceInternalToken } from '../../services/action_policy_saved_object_service/tokens';
import { savedObjectNamespacesToSpaceId } from '../../space_id_to_namespace';
import type {
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
  ActionPolicy,
  ActionPolicyId,
} from '../types';

@injectable()
export class FetchPoliciesStep implements DispatcherStep {
  public readonly name = 'fetch_policies';

  constructor(
    @inject(ActionPolicySavedObjectServiceInternalToken)
    private readonly actionPolicySavedObjectService: ActionPolicySavedObjectServiceContract
  ) {}

  public async execute(_state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    // TODO: future optimization: push the single_rule filter down to the SO query
    // by passing the dispatchable rule ids as a filter on `ruleId` (keyword mapping
    // already in place). This reduces decryption work for unrelated single_rule
    // policies. For now, the matcher step filters by ruleId in-memory.
    const result = await this.actionPolicySavedObjectService.findAllDecrypted({
      filter: { enabled: true },
    });

    const policies = new Map<ActionPolicyId, ActionPolicy>();

    for (const doc of result) {
      if ('error' in doc) {
        continue;
      }

      const { type, ruleId } = doc.attributes;
      const base = {
        id: doc.id,
        spaceId: savedObjectNamespacesToSpaceId(doc.namespaces),
        name: doc.attributes.name,
        enabled: doc.attributes.enabled,
        destinations: doc.attributes.destinations ?? [],
        matcher: doc.attributes.matcher ?? undefined,
        groupBy: doc.attributes.groupBy ?? [],
        tags: doc.attributes.tags ?? [],
        groupingMode: doc.attributes.groupingMode ?? undefined,
        throttle: doc.attributes.throttle ?? undefined,
        snoozedUntil: doc.attributes.snoozedUntil ?? null,
        apiKey: doc.attributes.auth.apiKey,
      };
      policies.set(
        doc.id,
        type === 'single_rule' ? { ...base, type, ruleId: ruleId as string } : { ...base, type }
      );
    }

    return { type: 'continue', data: { policies } };
  }
}
