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
  LINK_ROUTING_TAG_RESULT_GUIDANCE,
  linkRoutingTag,
  routingTagSchema,
  ruleAttachmentIdSchema,
  type LinkRoutingTagToolDeps,
} from './link_routing_tag';

const linkActionPolicyToRuleSchema = lazySchema(() =>
  z.object({
    ruleAttachmentId: ruleAttachmentIdSchema,
    tag: routingTagSchema,
  })
);

/** Bounded tool id — unique per action policy attachment instance. */
export const linkActionPolicyToRuleToolId = (actionPolicyAttachmentId: string): string =>
  `${ALERTING_NAMESPACE}.link_action_policy_to_rule.${actionPolicyAttachmentId}`;

export interface LinkActionPolicyToRuleToolParams extends LinkRoutingTagToolDeps {
  actionPolicyAttachmentId: string;
}

export const linkActionPolicyToRuleTool = ({
  actionPolicyAttachmentId,
  logger,
}: LinkActionPolicyToRuleToolParams): BuiltinAttachmentBoundedTool<
  typeof linkActionPolicyToRuleSchema
> => ({
  id: linkActionPolicyToRuleToolId(actionPolicyAttachmentId),
  type: ToolType.builtin,
  description: `Link action policy attachment "${actionPolicyAttachmentId}" to one alerting rule attachment by writing the same routing tag onto this policy's matcher.tags and the rule's metadata.routing_tags.

Use when notifications for one specific rule should match that rule instead of every alert in the space. Do not set matcher.tags or routing_tags by hand for this link, and do not call set_matcher on this policy after it. Only alert rules can be linked. Omit tag to derive notify-<rule-name>. Updates conversation attachments only and does not save the policy or the rule.

${LINK_ROUTING_TAG_RESULT_GUIDANCE}`,
  schema: linkActionPolicyToRuleSchema,
  handler: async ({ ruleAttachmentId, tag }, { attachments, spaceId }) =>
    linkRoutingTag(
      { ruleAttachmentId, actionPolicyAttachmentId, tag },
      { attachments, logger, spaceId }
    ),
});
