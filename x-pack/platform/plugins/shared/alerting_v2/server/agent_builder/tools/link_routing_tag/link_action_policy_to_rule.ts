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
import {
  actionPolicyAttachmentIdSchema,
  linkRoutingTag,
  routingTagSchema,
  ruleAttachmentIdSchema,
  type LinkRoutingTagToolDeps,
} from './link_routing_tag';

const linkActionPolicyToRuleSchema = lazySchema(() =>
  z.object({
    actionPolicyAttachmentId: actionPolicyAttachmentIdSchema,
    ruleAttachmentId: ruleAttachmentIdSchema,
    tag: routingTagSchema,
  })
);

export const linkActionPolicyToRuleTool = ({
  logger,
}: LinkRoutingTagToolDeps): BuiltinSkillBoundedTool<typeof linkActionPolicyToRuleSchema> => ({
  id: ALERTING_TOOL_IDS.linkActionPolicyToRule,
  type: ToolType.builtin,
  excludeFromMcp: true,
  description: `Link one action policy attachment to one alerting rule attachment by writing the same routing tag onto the policy's matcher.tags and the rule's metadata.routing_tags.

Use when notifications for one specific rule should match that rule instead of every alert in the space. Both attachment ids are required. Omit tag to derive notify-<rule-name>. Updates conversation attachments only and does not save the policy or the rule.`,
  schema: linkActionPolicyToRuleSchema,
  handler: async (input, { attachments, spaceId }) =>
    linkRoutingTag(input, { attachments, logger, spaceId }),
});
