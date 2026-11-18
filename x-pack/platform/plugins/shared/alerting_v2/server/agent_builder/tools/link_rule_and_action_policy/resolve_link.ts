/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_TOOL_IDS, MAX_TAGS } from '@kbn/alerting-v2-constants';
import type { ActionPolicyAttachmentData, RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import { POLICY_MATCHER_TAGS_MAX } from '@kbn/alerting-v2-schemas';
import type { AttachmentDraft, AttachmentsClient } from '../../../lib/attachments_client';
import { appendRoutingTag } from './append_routing_tag';
import { assertActionPolicyLinkable } from './assert_action_policy_linkable';
import { assertRuleLinkable } from './assert_rule_linkable';
import { generateRoutingTag } from './generate_routing_tag';
import { LinkValidationError } from './link_validation_error';

export interface ResolvedLink {
  tag: string;
  /** `true` when the rule and the policy already share a routing tag; nothing needs saving. */
  alreadyLinked: boolean;
  /** Consequences of the link the user should hear about before saving. */
  warnings: string[];
  rule: { draft: AttachmentDraft<RuleAttachmentData>; data: Partial<RuleAttachmentData> };
  policy: {
    draft: AttachmentDraft<ActionPolicyAttachmentData>;
    data: Partial<ActionPolicyAttachmentData>;
  };
}

interface ResolveLinkParams {
  ruleAttachmentId: string;
  policyAttachmentId: string;
}

/**
 * Reads the rule and policy drafts, validates they can be linked and computes their data
 * with the shared routing tag. Does not save anything.
 */
export const resolveLink = (
  { rules, actionPolicies }: Pick<AttachmentsClient, 'rules' | 'actionPolicies'>,
  { ruleAttachmentId, policyAttachmentId }: ResolveLinkParams
): ResolvedLink => {
  const ruleDraft = rules.getDraft(ruleAttachmentId);
  const { ruleId, metadata: ruleMetadata } = assertRuleLinkable(ruleDraft, ruleAttachmentId);

  const policyDraft = actionPolicies.getDraft(policyAttachmentId);
  const {
    matcher: policyMatcher,
    tags: policyTags,
    warnings,
  } = assertActionPolicyLinkable(policyDraft, policyAttachmentId);

  const { data: ruleData } = ruleDraft;
  const { data: policyData } = policyDraft;

  const sharedTag = (ruleMetadata.routing_tags ?? []).find((tag) => policyTags.includes(tag));
  if (sharedTag !== undefined) {
    return {
      tag: sharedTag,
      alreadyLinked: true,
      warnings,
      rule: { draft: ruleDraft, data: ruleData },
      policy: { draft: policyDraft, data: policyData },
    };
  }

  const tag = generateRoutingTag({ ruleName: ruleMetadata.name, ruleId });
  const { tags: nextRuleTags } = appendRoutingTag(ruleMetadata.routing_tags, tag);
  const { tags: nextPolicyTags } = appendRoutingTag(policyTags, tag);

  if (nextRuleTags.length > MAX_TAGS) {
    throw new LinkValidationError(
      `The rule already has ${MAX_TAGS} routing tags, the maximum. Remove one with ${ALERTING_TOOL_IDS.manageRule} before linking.`
    );
  }
  if (nextPolicyTags.length > POLICY_MATCHER_TAGS_MAX) {
    throw new LinkValidationError(
      `The action policy already has ${POLICY_MATCHER_TAGS_MAX} matcher tags, the maximum. Remove one with ${ALERTING_TOOL_IDS.manageActionPolicy} before linking.`
    );
  }

  return {
    tag,
    alreadyLinked: false,
    warnings,
    rule: {
      draft: ruleDraft,
      data: { ...ruleData, metadata: { ...ruleMetadata, routing_tags: nextRuleTags } },
    },
    policy: {
      draft: policyDraft,
      data: { ...policyData, matcher: { ...policyMatcher, tags: nextPolicyTags } },
    },
  };
};
