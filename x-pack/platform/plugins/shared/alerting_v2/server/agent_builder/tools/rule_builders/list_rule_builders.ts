/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { ALERTING_TOOL_IDS } from '@kbn/alerting-v2-constants';
import { RULE_BUILDER_TYPES, type RuleBuilderType } from '@kbn/alerting-v2-rule-builders';
import { CUSTOM_RULE_WHEN_TO_USE } from '../../skills/schema_to_skill_docs';
import { getDraftBuilderRuleToolId } from './tool_ids';
import { ruleToolResult } from './tool_results';

export interface RuleBuilderOption {
  readonly type: string;
  readonly title: string;
  readonly summary: string;
  readonly whenToUse: string;
  readonly draftToolId: string;
  readonly examples: string[];
}

export interface RuleBuilderOptions {
  readonly builders: RuleBuilderOption[];
  readonly customRule: { readonly draftToolId: string; readonly whenToUse: string };
}

const toBuilderOption = (builder: RuleBuilderType): RuleBuilderOption => ({
  type: builder.type,
  title: builder.title,
  summary: builder.summary,
  whenToUse: builder.whenToUse,
  draftToolId: getDraftBuilderRuleToolId(builder),
  examples: builder.examples.map(({ description }) => description),
});

/** Every registered rule builder, plus the custom ES|QL fallback, in the order an agent should consider them. */
export const getRuleBuilderOptions = (): RuleBuilderOptions => ({
  builders: Object.values(RULE_BUILDER_TYPES).map(toBuilderOption),
  customRule: {
    draftToolId: ALERTING_TOOL_IDS.draftCustomRule,
    whenToUse: CUSTOM_RULE_WHEN_TO_USE,
  },
});

const listRuleBuildersSchema = lazySchema(() => z.object({}));

/** Creates the skill tool that lists the rule builders and when to use each one. */
export const listRuleBuildersTool = (): BuiltinSkillBoundedTool<typeof listRuleBuildersSchema> => ({
  id: ALERTING_TOOL_IDS.listRuleBuilders,
  type: ToolType.builtin,
  description: `List the rule builders available for new alerting V2 rules: what each one produces, when to use it, the tool that drafts it and example use cases. Also returns when to fall back to \`${ALERTING_TOOL_IDS.draftCustomRule}\` for custom ES|QL. Call this before drafting a new rule when it isn't clear which builder fits the request. Read-only.`,
  schema: listRuleBuildersSchema,
  handler: async () => ruleToolResult({ ...getRuleBuilderOptions() }),
});
