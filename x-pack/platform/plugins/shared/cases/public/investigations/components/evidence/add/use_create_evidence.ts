/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type {
  ClaimItem,
  EvidenceDetails,
  InvestigationItem,
  ItemInput,
} from '../../../../../common/investigations/types';
import { useBulkCreateItems, useBulkUpdateItems, useInvestigationToasts } from '../../../hooks';
import { useInvestigationsServices } from '../../../services';
import * as i18n from '../translations';

export type EvidenceInput = Extract<ItemInput, { kind: 'evidence' }>;

/** Builds the evidence item input shared by every kind. */
export const toEvidenceInput = (
  title: string,
  evidence: EvidenceDetails,
  options?: { text?: string }
): EvidenceInput => ({
  kind: 'evidence',
  title: title.trim(),
  ...(options?.text ? { text: options.text } : {}),
  evidence,
});

export interface CreateEvidenceParams {
  inputs: EvidenceInput[];
  /** The claim to link the new evidence to as support. */
  claim?: ClaimItem;
  /** Turn off indicator extraction when attaching many alerts at once. */
  extractIndicators?: boolean;
}

/** Creates evidence items, optionally links them to a claim, and toasts the result. */
export const useCreateEvidence = (recordId: string) => {
  const bulkCreate = useBulkCreateItems(recordId);
  const bulkUpdate = useBulkUpdateItems(recordId);
  const { showSuccess } = useInvestigationToasts();
  const { notifications } = useInvestigationsServices();

  const linkToClaim = useCallback(
    async (items: InvestigationItem[], claim: ClaimItem): Promise<void> => {
      if (items.length === 0) return;
      const existing = new Set(claim.claim.supporting_evidence_ids);
      const added = items.map(({ id }) => id).filter((id) => !existing.has(id));
      const result = await bulkUpdate.mutateAsync({
        items: [
          {
            id: claim.id,
            version: claim.version,
            patch: {
              claim: {
                supporting_evidence_ids: [...claim.claim.supporting_evidence_ids, ...added],
              },
            },
          },
        ],
      });
      if (result.errors.length > 0) {
        notifications.toasts.addWarning({ title: i18n.LINK_CONFLICT(claim.ref) });
      }
    },
    [bulkUpdate, notifications.toasts]
  );

  const create = useCallback(
    async ({
      inputs,
      claim,
      extractIndicators,
    }: CreateEvidenceParams): Promise<InvestigationItem[]> => {
      const { items, errors } = await bulkCreate.mutateAsync({
        items: inputs,
        ...(extractIndicators === undefined ? {} : { extract_indicators: extractIndicators }),
      });
      if (errors.length > 0) {
        notifications.toasts.addWarning({
          title: i18n.CREATE_PARTIAL(errors.length),
          text: errors
            .slice(0, 3)
            .map(({ message }) => message)
            .join(' '),
        });
      }
      if (claim) {
        await linkToClaim(items, claim);
      }
      if (items.length === 1) {
        showSuccess(i18n.ADDED_ONE(items[0].ref));
      } else if (items.length > 1) {
        showSuccess(i18n.ADDED_MANY(items.length));
      }
      return items;
    },
    [bulkCreate, linkToClaim, notifications.toasts, showSuccess]
  );

  return { create, linkToClaim, isLoading: bulkCreate.isLoading || bulkUpdate.isLoading };
};
