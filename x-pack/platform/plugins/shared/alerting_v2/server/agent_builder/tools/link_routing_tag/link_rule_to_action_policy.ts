/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinAttachmentBoundedTool } from '@kbn/agent-builder-server/attachments';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { ALERTING_NAMESPACE, ALERTING_TOOL_IDS } from '@kbn/alerting-v2-constants';
import {
  actionPolicyAttachmentIdSchema,
  LINK_ROUTING_TAG_RESULT_GUIDANCE,
  linkRoutingTag,
  routingTagSchema,
  ruleAttachmentIdSchema,
  type LinkRoutingTagToolDeps,
} from './link_routing_tag';

const LINK_RULE_TO_ACTION_POLICY_USAGE = `Use when this rule should notify through an action policy already in the conversation. Do not set routing_tags or matcher.tags by hand for this link. Only alert rules can be linked. Catch-all and expression-only policies are not linked with this tool. Omit tag to derive notify-<rule-name>. Updates conversation attachments only and does not save the rule or the policy.

${LINK_ROUTING_TAG_RESULT_GUIDANCE}`;

const linkRuleToActionPolicySkillSchema = lazySchema(() =>
  z.object({
    ruleAttachmentId: ruleAttachmentIdSchema,
    actionPolicyAttachmentId: actionPolicyAttachmentIdSchema,
    tag: routingTagSchema,
  })
);

const linkRuleToActionPolicySchema = lazySchema(() =>
  z.object({
    actionPolicyAttachmentId: actionPolicyAttachmentIdSchema,
    tag: routingTagSchema,
  })
);

/** Bounded tool id — unique per rule attachment instance. */
export const linkRuleToActionPolicyToolId = (ruleAttachmentId: string): string =>
  `${ALERTING_NAMESPACE}.link_rule_to_action_policy.${ruleAttachmentId}`;

export interface LinkRuleToActionPolicyToolParams extends LinkRoutingTagToolDeps {
  ruleAttachmentId: string;
}

/** Skill-bound variant that takes both attachment ids. */
export const linkRuleToActionPolicySkillTool = ({
  logger,
}: LinkRoutingTagToolDeps): BuiltinSkillBoundedTool<typeof linkRuleToActionPolicySkillSchema> => ({
  id: ALERTING_TOOL_IDS.linkRuleToActionPolicy,
  type: ToolType.builtin,
  excludeFromMcp: true,
  description: `Link one alerting rule attachment to one action policy attachment by writing the same routing tag onto the rule's metadata.routing_tags and the policy's matcher.tags. Both attachment ids are required.

${LINK_RULE_TO_ACTION_POLICY_USAGE}`,
  schema: linkRuleToActionPolicySkillSchema,
  handler: async (input, { attachments, spaceId }) =>
    linkRoutingTag(input, { attachments, logger, spaceId }),
});

export const linkRuleToActionPolicyTool = ({
  ruleAttachmentId,
  logger,
}: LinkRuleToActionPolicyToolParams): BuiltinAttachmentBoundedTool<
  typeof linkRuleToActionPolicySchema
> => ({
  id: linkRuleToActionPolicyToolId(ruleAttachmentId),
  type: ToolType.builtin,
  description: `Link rule attachment "${ruleAttachmentId}" to one action policy attachment by writing the same routing tag onto this rule's metadata.routing_tags and the policy's matcher.tags.

${LINK_RULE_TO_ACTION_POLICY_USAGE}`,
  schema: linkRuleToActionPolicySchema,
  handler: async ({ actionPolicyAttachmentId, tag }, { attachments, spaceId }) =>
    linkRoutingTag(
      { ruleAttachmentId, actionPolicyAttachmentId, tag },
      { attachments, logger, spaceId }
    ),
});
