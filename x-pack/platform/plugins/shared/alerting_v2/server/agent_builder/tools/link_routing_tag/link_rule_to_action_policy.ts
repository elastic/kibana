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

const linkRuleToActionPolicySchema = lazySchema(() =>
  z.object({
    ruleAttachmentId: ruleAttachmentIdSchema,
    actionPolicyAttachmentId: actionPolicyAttachmentIdSchema,
    tag: routingTagSchema,
  })
);

export const linkRuleToActionPolicyTool = ({
  logger,
}: LinkRoutingTagToolDeps): BuiltinSkillBoundedTool<typeof linkRuleToActionPolicySchema> => ({
  id: ALERTING_TOOL_IDS.linkRuleToActionPolicy,
  type: ToolType.builtin,
  excludeFromMcp: true,
  description: `Link one alerting rule attachment to one action policy attachment by writing the same routing tag onto the rule's metadata.routing_tags and the policy's matcher.tags.

Use when this rule should notify through an action policy already in the conversation. Both attachment ids are required. Omit tag to derive notify-<rule-name>. Updates conversation attachments only and does not save the rule or the policy.`,
  schema: linkRuleToActionPolicySchema,
  handler: async (input, { attachments, spaceId }) =>
    linkRoutingTag(input, { attachments, logger, spaceId }),
});
