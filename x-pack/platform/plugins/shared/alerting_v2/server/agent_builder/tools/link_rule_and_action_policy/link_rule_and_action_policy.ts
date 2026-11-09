/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { ALERTING_TOOL_IDS } from '@kbn/alerting-v2-constants';

const linkRuleAndActionPolicySchema = lazySchema(() =>
  z.object({
    ruleAttachmentId: z
      .string()
      .max(256)
      .describe('The rule attachment ID to link, as returned by `manage_rule`.'),
    policyAttachmentId: z
      .string()
      .max(256)
      .describe('The action policy attachment ID to link, as returned by `manage_action_policy`.'),
  })
);

export const linkRuleAndActionPolicyTool = (): BuiltinSkillBoundedTool<
  typeof linkRuleAndActionPolicySchema
> => ({
  id: ALERTING_TOOL_IDS.linkRuleAndActionPolicy,
  type: ToolType.builtin,
  description: `Link a rule and an action policy so the policy notifies on the rule's alerts.

The tool generates one routing tag and writes it to both the rule attachment
(\`metadata.routing_tags\`) and the action policy attachment (\`matcher.tags\`) in a
single call. Do NOT set these tags by hand. If the policy update fails, the rule
attachment is restored.

This tool only mutates the attachments shown in the conversation. It does NOT save
the underlying rule or action policy: direct the user to the buttons in the rendered
attachments.`,
  schema: linkRuleAndActionPolicySchema,
  handler: async () => ({
    results: [
      {
        type: ToolResultType.error,
        data: { message: 'link_rule_and_action_policy is not implemented yet.' },
      },
    ],
  }),
});
