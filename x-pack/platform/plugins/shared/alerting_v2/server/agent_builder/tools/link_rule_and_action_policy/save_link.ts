/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentsClient } from '../../../lib/attachments_client';
import type { ResolvedLink } from './resolve_link';

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** The policy update failed and the rule attachment could not be restored either. */
export class LinkRollbackError extends Error {
  constructor(public readonly saveError: unknown, public readonly rollbackError: unknown) {
    super(
      `Failed to save the action policy (${errorMessage(saveError)}) and to restore the rule ` +
        `attachment (${errorMessage(
          rollbackError
        )}). The rule attachment keeps the new routing tag.`
    );
  }
}

export interface SavedLink {
  ruleAttachment: VersionedAttachment;
  policyAttachment: VersionedAttachment;
}

/**
 * Saves the rule attachment first and then the policy attachment. If the policy update fails,
 * the rule attachment is restored to its previous data and the original error is rethrown.
 */
export const saveLink = async (
  { rules, actionPolicies }: Pick<AttachmentsClient, 'rules' | 'actionPolicies'>,
  { rule, policy }: ResolvedLink
): Promise<SavedLink> => {
  const ruleAttachment = await rules.saveDraft(rule.draft, rule.data);

  try {
    const policyAttachment = await actionPolicies.saveDraft(policy.draft, policy.data);
    return { ruleAttachment, policyAttachment };
  } catch (saveError) {
    try {
      await rules.saveDraft(rule.draft, rule.draft.data);
    } catch (rollbackError) {
      throw new LinkRollbackError(saveError, rollbackError);
    }
    throw saveError;
  }
};
