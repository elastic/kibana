/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { RulesSavedObjectServiceContract } from '../../services/rules_saved_object_service/rules_saved_object_service';
import { RulesSavedObjectServiceInternalToken } from '../../services/rules_saved_object_service/tokens';
import { savedObjectNamespacesToSpaceId } from '../../space_id_to_namespace';
import type {
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
  Rule,
  RuleId,
} from '../types';

@injectable()
export class FetchRulesStep implements DispatcherStep {
  public readonly name = 'fetch_rules';

  constructor(
    @inject(RulesSavedObjectServiceInternalToken)
    private readonly rulesSavedObjectService: RulesSavedObjectServiceContract
  ) {}

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    const { dispatchable = [] } = state;

    const uniqueRuleIds = Array.from(new Set(dispatchable.map((ep) => ep.rule_id)));
    if (uniqueRuleIds.length === 0) {
      return { type: 'continue', data: { rules: new Map() } };
    }

    const result = await this.rulesSavedObjectService.findByIds(uniqueRuleIds);
    const rules = new Map<RuleId, Rule>();

    for (const doc of result) {
      rules.set(doc.id, {
        id: doc.id,
        spaceId: savedObjectNamespacesToSpaceId(doc.namespaces),
        name: doc.attributes.metadata.name,
        tags: doc.attributes.metadata.tags ?? [],
        // POC: read directly from the attribute (raw parent rule ids). Production
        // resolves this from `references[]` instead (see rna-program#753 / kibana#280212).
        dependsOn: doc.attributes.depends_on ?? [],
      });
    }

    return { type: 'continue', data: { rules } };
  }
}
