/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_TOOL_IDS } from '@kbn/alerting-v2-constants';
import type { RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import type { AttachmentDraft } from '../../../lib/attachments_client';
import { LinkValidationError } from './link_validation_error';

export interface LinkableRule {
  ruleId: string;
  metadata: NonNullable<RuleAttachmentData['metadata']>;
}

/**
 * Checks that the rule draft exists and can receive a routing tag: it is named, it is an
 * `alert` rule (signal rules never create alerts) and it has an id for the tag suffix.
 */
export const assertRuleLinkable = (
  draft: AttachmentDraft<RuleAttachmentData>,
  attachmentId: string
): LinkableRule => {
  if (draft.isNew) {
    throw new LinkValidationError(
      `Rule attachment "${attachmentId}" was not found. Create it with ${ALERTING_TOOL_IDS.manageRule} first.`
    );
  }

  const { metadata, kind, id } = draft.data;
  if (!metadata?.name) {
    throw new LinkValidationError(
      `The rule has no name yet. Set one with ${ALERTING_TOOL_IDS.manageRule} before linking.`
    );
  }
  if (kind !== 'alert') {
    throw new LinkValidationError(
      kind === 'signal'
        ? 'Signal rules never create alerts, so they cannot be linked to an action policy. Switch the rule to `alert` first if it should notify.'
        : `The rule has no kind yet. Set it with ${ALERTING_TOOL_IDS.manageRule} before linking.`
    );
  }
  const ruleId = draft.origin ?? id;
  if (!ruleId) {
    throw new LinkValidationError(
      `The rule has no id yet. Update the rule with ${ALERTING_TOOL_IDS.manageRule} before linking.`
    );
  }

  return { ruleId, metadata };
};
