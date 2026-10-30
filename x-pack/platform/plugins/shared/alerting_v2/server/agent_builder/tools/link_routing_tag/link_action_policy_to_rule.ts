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
  LINK_ROUTING_TAG_RESULT_GUIDANCE,
  linkRoutingTag,
  routingTagSchema,
  ruleAttachmentIdSchema,
  type LinkRoutingTagToolDeps,
} from './link_routing_tag';

const LINK_ACTION_POLICY_TO_RULE_USAGE = `Use when notifications for one specific rule should match that rule instead of every alert in the space. Existing matcher tags on the policy are kept, so the policy only matches this rule alone when it had no matcher tags before. Do not set matcher.tags or routing_tags by hand for this link, and do not call set_matcher on this policy after it. Only alert rules can be linked. Omit tag to derive notify-<rule-name>. Updates conversation attachments only and does not save the policy or the rule.

${LINK_ROUTING_TAG_RESULT_GUIDANCE}`;

const linkActionPolicyToRuleSkillSchema = lazySchema(() =>
  z.object({
    actionPolicyAttachmentId: actionPolicyAttachmentIdSchema,
    ruleAttachmentId: ruleAttachmentIdSchema,
    tag: routingTagSchema,
  })
);

/** Skill-bound tool that takes both attachment ids. */
export const linkActionPolicyToRuleSkillTool = ({
  logger,
}: LinkRoutingTagToolDeps): BuiltinSkillBoundedTool<typeof linkActionPolicyToRuleSkillSchema> => ({
  id: ALERTING_TOOL_IDS.linkActionPolicyToRule,
  type: ToolType.builtin,
  excludeFromMcp: true,
  description: `Link one action policy attachment to one alerting rule attachment by writing the same routing tag onto the policy's matcher.tags and the rule's metadata.routing_tags. Both attachment ids are required.

${LINK_ACTION_POLICY_TO_RULE_USAGE}`,
  schema: linkActionPolicyToRuleSkillSchema,
  handler: async (input, { attachments, spaceId }) =>
    linkRoutingTag(input, { attachments, logger, spaceId }),
});
