/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getLatestVersion,
  getVersion,
  type VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { RULE_ATTACHMENT_TYPE, type RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import { parseRenderAttachmentRef } from './evaluators/expected_render_attachment';

/**
 * Picks the rule attachment data the eval should assert against:
 * 1. The id/version referenced by the latest assistant `<render_attachment>` tag, if present
 * 2. Otherwise the latest version of the most recently listed `rule` attachment
 */
export const resolveRuleAttachmentData = (
  attachments: VersionedAttachment[],
  assistantMessages: string[]
): RuleAttachmentData | undefined => {
  for (let i = assistantMessages.length - 1; i >= 0; i--) {
    const ref = parseRenderAttachmentRef(assistantMessages[i]);
    if (!ref) {
      continue;
    }
    const record = attachments.find((attachment) => attachment.id === ref.id);
    if (!record) {
      continue;
    }
    const versioned =
      getVersion<RuleAttachmentData>(
        record as VersionedAttachment<string, RuleAttachmentData>,
        ref.version
      ) ??
      getLatestVersion<RuleAttachmentData>(
        record as VersionedAttachment<string, RuleAttachmentData>
      );
    if (versioned) {
      return versioned.data;
    }
  }

  const ruleAttachments = attachments.filter(
    (attachment) => attachment.type === RULE_ATTACHMENT_TYPE
  );
  const latestRecord = ruleAttachments[ruleAttachments.length - 1];
  if (!latestRecord) {
    return undefined;
  }

  return getLatestVersion<RuleAttachmentData>(
    latestRecord as VersionedAttachment<string, RuleAttachmentData>
  )?.data;
};
