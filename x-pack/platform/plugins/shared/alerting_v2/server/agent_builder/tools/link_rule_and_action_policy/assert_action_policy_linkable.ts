/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_TOOL_IDS } from '@kbn/alerting-v2-constants';
import type { ActionPolicyAttachmentData } from '@kbn/alerting-v2-schemas';
import type { AttachmentDraft } from '../../../lib/attachments_client';
import { LinkValidationError } from './link_validation_error';

export interface LinkableActionPolicy {
  matcher: ActionPolicyAttachmentData['matcher'];
  /** Current `matcher.tags`, empty when the matcher has none. */
  tags: readonly string[];
  /** Consequences the user should hear about before saving; the link is still allowed. */
  warnings: string[];
}

/**
 * Checks that the action policy draft exists and can receive a routing tag. A policy that is
 * already saved and has no `matcher.tags` applies to every alert rule, so adding a tag narrows
 * it and other rules stop notifying through it once it is saved: this is allowed but reported
 * as a warning. An unsaved draft can be shaped freely.
 */
export const assertActionPolicyLinkable = (
  draft: AttachmentDraft<ActionPolicyAttachmentData>,
  attachmentId: string
): LinkableActionPolicy => {
  if (draft.isNew) {
    throw new LinkValidationError(
      `Action policy attachment "${attachmentId}" was not found. Create it with ${ALERTING_TOOL_IDS.manageActionPolicy} first.`
    );
  }

  const { matcher } = draft.data;
  const tags = matcher?.tags ?? [];
  const warnings =
    draft.origin !== undefined && tags.length === 0
      ? [
          'This saved action policy has no `matcher.tags`, so it applies to every alert rule. Linking narrows it to this rule: once the user saves the policy, other rules will stop notifying through it. Tell the user about this.',
        ]
      : [];

  return { matcher, tags, warnings };
};
