/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinAttachmentBoundedTool } from '@kbn/agent-builder-server/attachments';
import { ALERTING_NAMESPACE } from '@kbn/alerting-v2-constants';
import {
  actionPolicyAttachmentIdSchema,
  LINK_ROUTING_TAG_RESULT_GUIDANCE,
  linkRoutingTag,
  routingTagSchema,
  type LinkRoutingTagToolDeps,
} from './link_routing_tag';

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

export const linkRuleToActionPolicyTool = ({
  ruleAttachmentId,
  logger,
}: LinkRuleToActionPolicyToolParams): BuiltinAttachmentBoundedTool<
  typeof linkRuleToActionPolicySchema
> => ({
  id: linkRuleToActionPolicyToolId(ruleAttachmentId),
  type: ToolType.builtin,
  description: `Link rule attachment "${ruleAttachmentId}" to one action policy attachment by writing the same routing tag onto this rule's metadata.routing_tags and the policy's matcher.tags.

Use when this rule should notify through an action policy already in the conversation. Do not set routing_tags or matcher.tags by hand for this link. Only alert rules can be linked. Catch-all and expression-only policies are not linked with this tool. Omit tag to derive notify-<rule-name>. Updates conversation attachments only and does not save the rule or the policy.

${LINK_ROUTING_TAG_RESULT_GUIDANCE}`,
  schema: linkRuleToActionPolicySchema,
  handler: async ({ actionPolicyAttachmentId, tag }, { attachments, spaceId }) =>
    linkRoutingTag(
      { ruleAttachmentId, actionPolicyAttachmentId, tag },
      { attachments, logger, spaceId }
    ),
});
