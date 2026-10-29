/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_NAMESPACE } from '@kbn/alerting-v2-constants';
import type { RuleBuilderType } from '@kbn/alerting-v2-rule-builders';

const ATTACHMENT_SUFFIX_LENGTH = 8;

/**
 * Attachment-bound tool ids must be unique per attachment, since every rule attachment
 * in the conversation exposes its own tools. Tool ids are capped at 64 characters, so
 * only a short, id-safe prefix of the attachment id is used.
 */
const toAttachmentSuffix = (attachmentId: string): string =>
  attachmentId
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, ATTACHMENT_SUFFIX_LENGTH) || '0';

/** Name of the skill-level tool that creates a rule with the builder, e.g. `draft_threshold_rule`. */
export const getDraftBuilderRuleToolName = ({ type }: Pick<RuleBuilderType, 'type'>) =>
  `draft_${type}_rule`;

/** Skill-level tool that creates a rule with the builder, e.g. `platform.alerting.draft_threshold_rule`. */
export const getDraftBuilderRuleToolId = (builder: Pick<RuleBuilderType, 'type'>) =>
  `${ALERTING_NAMESPACE}.${getDraftBuilderRuleToolName(builder)}`;

/** Attachment-bound tool that patches a builder rule's params and settings. */
export const getUpdateBuilderRuleToolId = (
  { type }: Pick<RuleBuilderType, 'type'>,
  attachmentId: string
) => `${ALERTING_NAMESPACE}.update_${type}_rule_${toAttachmentSuffix(attachmentId)}`;

/** Attachment-bound tool that turns a builder rule into a custom ES|QL rule. */
export const getConvertToCustomRuleToolId = (attachmentId: string) =>
  `${ALERTING_NAMESPACE}.convert_to_custom_rule_${toAttachmentSuffix(attachmentId)}`;
