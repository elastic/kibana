/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { MAX_TAG_LENGTH, MAX_TAGS } from '@kbn/alerting-v2-constants';
import {
  POLICY_MATCHER_TAGS_MAX,
  type ActionPolicyAttachmentData,
  type RuleAttachmentData,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import {
  createAttachmentsClient,
  type AttachmentDraft,
  type TypedAttachmentClient,
} from '../../../lib/attachments_client';

const NOTIFY_PREFIX = 'notify-';
const ATTACHMENT_ID_MAX_LENGTH = 256;

/** Expected linker failures. Callers return these as tool errors without a warn log. */
export class LinkRoutingTagError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LinkRoutingTagError';
  }
}

export interface LinkRoutingTagToolDeps {
  logger: LoggerServiceContract;
}

export interface LinkRoutingTagInput {
  ruleAttachmentId: string;
  actionPolicyAttachmentId: string;
  tag?: string;
}

export const ruleAttachmentIdSchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(ATTACHMENT_ID_MAX_LENGTH)
    .describe('Conversation attachment id of the alert rule to link.')
);

export const actionPolicyAttachmentIdSchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(ATTACHMENT_ID_MAX_LENGTH)
    .describe('Conversation attachment id of the action policy to link.')
);

export const routingTagSchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(MAX_TAG_LENGTH)
    .optional()
    .describe(
      'Routing tag written onto the rule routing_tags and the policy matcher tags. Omit to use notify-<kebab of the rule name>.'
    )
);

const sameList = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

/** `notify-<kebab of name>`, trimmed to the routing-tag length cap. */
export const routingTagFromRuleName = (name: string): string | undefined => {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) {
    return undefined;
  }
  const maxSlugLength = MAX_TAG_LENGTH - NOTIFY_PREFIX.length;
  const tag = `${NOTIFY_PREFIX}${slug.slice(0, maxSlugLength)}`.replace(/-+$/g, '');
  return tag.length > NOTIFY_PREFIX.length ? tag : undefined;
};

const unionTag = (
  existing: readonly string[] | null | undefined,
  tag: string,
  cap: number,
  capMessage: string
): string[] => {
  const current = existing ?? [];
  if (current.includes(tag)) {
    return [...current];
  }
  if (current.length >= cap) {
    throw new LinkRoutingTagError(capMessage);
  }
  return [...current, tag];
};

const resolveDraft = <TData>(
  attachments: AttachmentStateManager,
  client: TypedAttachmentClient<TData>,
  attachmentId: string,
  label: string,
  expectedPhrase: string
): AttachmentDraft<TData> & { version: number } => {
  const record = attachments.getAttachmentRecord(attachmentId);
  if (!record) {
    throw new LinkRoutingTagError(`${label} attachment "${attachmentId}" was not found.`);
  }
  if (record.type !== client.type) {
    throw new LinkRoutingTagError(
      `Attachment "${attachmentId}" is of type "${record.type}", expected ${expectedPhrase}.`
    );
  }
  return { ...client.getDraft(attachmentId), version: record.current_version };
};

export interface LinkRoutingTagResult {
  routing_tag: string;
  rule_saved: boolean;
  matches_before_rule_saved?: false;
  ruleAttachment: {
    id: string;
    version: number;
    ruleId?: string;
    routing_tags: string[];
  };
  actionPolicyAttachment: {
    id: string;
    version: number;
    policyId?: string;
    matcher_tags: string[];
  };
}

/**
 * Writes one routing tag onto a rule attachment and an action policy attachment.
 * Attachment drafts only — does not persist the rule or the policy.
 */
export const linkRoutingTag = async (
  { ruleAttachmentId, actionPolicyAttachmentId, tag }: LinkRoutingTagInput,
  {
    attachments,
    logger,
    spaceId,
  }: LinkRoutingTagToolDeps & { attachments: AttachmentStateManager; spaceId: string }
) => {
  let ruleId: string | undefined;
  let policyId: string | undefined;
  try {
    const client = createAttachmentsClient(attachments);
    const rule = resolveDraft(attachments, client.rules, ruleAttachmentId, 'Rule', 'a rule');
    const policy = resolveDraft(
      attachments,
      client.actionPolicies,
      actionPolicyAttachmentId,
      'Action policy',
      'an action policy'
    );
    ruleId = rule.origin ?? rule.data.id;
    policyId = policy.origin ?? policy.data.id;

    if (rule.data.kind !== 'alert') {
      throw new LinkRoutingTagError(
        'Routing tags are only allowed on alert rules. Set the rule kind to alert before linking.'
      );
    }

    const routingTag = tag ?? routingTagFromRuleName(rule.data.metadata?.name ?? '');
    if (!routingTag) {
      throw new LinkRoutingTagError(
        'The rule has no name. Pass a tag or name the rule before linking.'
      );
    }

    const nextRoutingTags = unionTag(
      rule.data.metadata?.routing_tags,
      routingTag,
      MAX_TAGS,
      `The rule already has ${MAX_TAGS} routing tags. Ask which existing routing tag to drop before adding "${routingTag}".`
    );
    const nextMatcherTags = unionTag(
      policy.data.matcher?.tags,
      routingTag,
      POLICY_MATCHER_TAGS_MAX,
      `The action policy already has ${POLICY_MATCHER_TAGS_MAX} matcher tags. Ask which existing matcher tag to drop before adding "${routingTag}".`
    );

    const existingRoutingTags = rule.data.metadata?.routing_tags ?? [];
    const existingMatcherTags = policy.data.matcher?.tags ?? [];
    const ruleChanged = !sameList(existingRoutingTags, nextRoutingTags);
    const policyChanged = !sameList(existingMatcherTags, nextMatcherTags);

    const nextRuleData: Partial<RuleAttachmentData> = {
      ...rule.data,
      metadata: {
        ...rule.data.metadata,
        name: rule.data.metadata?.name ?? '',
        routing_tags: nextRoutingTags,
      },
    };
    const expression = policy.data.matcher?.expression;
    const nextPolicyData: Partial<ActionPolicyAttachmentData> = {
      ...policy.data,
      matcher:
        expression != null && expression !== ''
          ? { tags: nextMatcherTags, expression }
          : { tags: nextMatcherTags },
    };

    let ruleVersion = rule.version;
    let policyVersion = policy.version;

    if (ruleChanged) {
      const savedRule = await client.rules.saveDraft(rule, nextRuleData);
      ruleVersion = savedRule.current_version ?? ruleVersion;
    }

    if (policyChanged) {
      try {
        const savedPolicy = await client.actionPolicies.saveDraft(policy, nextPolicyData);
        policyVersion = savedPolicy.current_version ?? policyVersion;
      } catch (error) {
        if (ruleChanged) {
          try {
            await client.rules.saveDraft(rule, rule.data);
          } catch (rollbackError) {
            logger.warn({
              message: 'Failed to roll back rule attachment after action policy link failed',
              code: ALERTING_LOG_CODES.AGENT_BUILDER_LINK_ROUTING_TAG_FAILED,
              labels: {
                space_id: spaceId,
                ...(ruleId != null ? { rule_id: ruleId } : {}),
                ...(policyId != null ? { policy_id: policyId } : {}),
              },
              error: rollbackError,
            });
          }
        }
        throw error;
      }
    }

    const ruleSaved = rule.origin != null;
    const result: LinkRoutingTagResult = {
      routing_tag: routingTag,
      rule_saved: ruleSaved,
      ...(ruleSaved ? {} : { matches_before_rule_saved: false as const }),
      ruleAttachment: {
        id: rule.attachmentId,
        version: ruleVersion,
        ...(nextRuleData.id != null ? { ruleId: nextRuleData.id } : {}),
        routing_tags: nextRoutingTags,
      },
      actionPolicyAttachment: {
        id: policy.attachmentId,
        version: policyVersion,
        ...(nextPolicyData.id != null ? { policyId: nextPolicyData.id } : {}),
        matcher_tags: nextMatcherTags,
      },
    };

    logger.debug({
      message: () => 'Rule and action policy linked by routing tag',
      labels: {
        space_id: spaceId,
        ...(ruleId != null ? { rule_id: ruleId } : {}),
        ...(policyId != null ? { policy_id: policyId } : {}),
      },
    });

    return {
      results: [
        {
          type: ToolResultType.other,
          tool_result_id: getToolResultId(),
          data: result,
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof LinkRoutingTagError) {
      logger.debug({
        message: 'Invalid link routing tag input',
        labels: {
          space_id: spaceId,
          ...(ruleId != null ? { rule_id: ruleId } : {}),
          ...(policyId != null ? { policy_id: policyId } : {}),
        },
      });
    } else {
      logger.warn({
        message: 'Failed to link rule and action policy',
        code: ALERTING_LOG_CODES.AGENT_BUILDER_LINK_ROUTING_TAG_FAILED,
        labels: {
          space_id: spaceId,
          ...(ruleId != null ? { rule_id: ruleId } : {}),
          ...(policyId != null ? { policy_id: policyId } : {}),
        },
        error,
      });
    }
    return {
      results: [
        {
          type: ToolResultType.error,
          data: {
            message: `Failed to link rule and action policy: ${message}`,
          },
        },
      ],
    };
  }
};
