/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { RULE_BUILDER_TYPES } from '@kbn/alerting-v2-rule-builders';
import { getRuleBuilderOptions, listRuleBuildersTool } from './list_rule_builders';

describe('listRuleBuildersTool', () => {
  const tool = listRuleBuildersTool();

  it('is registered under the alerting namespace and takes no input', () => {
    expect(tool.id).toBe('platform.alerting.list_rule_builders');
    expect(tool.schema.safeParse({}).success).toBe(true);
  });

  it('lists every registered builder with when to use it and the tool that drafts it', () => {
    const { builders } = getRuleBuilderOptions();

    expect(builders.map(({ type }) => type)).toEqual(Object.keys(RULE_BUILDER_TYPES));
    expect(builders).toContainEqual({
      type: 'threshold',
      title: 'Threshold',
      summary: RULE_BUILDER_TYPES.threshold.summary,
      whenToUse: RULE_BUILDER_TYPES.threshold.whenToUse,
      draftToolId: 'platform.alerting.draft_threshold_rule',
      examples: RULE_BUILDER_TYPES.threshold.examples.map(({ description }) => description),
    });
  });

  it('includes the custom ES|QL fallback', () => {
    const { customRule } = getRuleBuilderOptions();

    expect(customRule.draftToolId).toBe('platform.alerting.draft_custom_rule');
    expect(customRule.whenToUse).toContain('ES|QL that no builder can express');
  });

  it('returns the options as the tool result', async () => {
    const result = await tool.handler({}, agentBuilderMocks.tools.createHandlerContext());

    expect(result).toMatchObject({
      results: [{ type: ToolResultType.other, data: getRuleBuilderOptions() }],
    });
  });
});
