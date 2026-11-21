/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type {
  FindItemsRequest,
  InvestigationRecord,
} from '../../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import { useItems } from '../../hooks';

/** A message a claim can be created from. */
export interface ClaimSource {
  conversationId: string;
  /** Round, event or comment id stored as `source_message.message_id`. */
  messageId: string;
  /** "Message 4" or "Message by Priya K.". */
  label: string;
  authorName: string;
  ts: string;
  text: string;
}

export interface PinnedClaim {
  claimId: string;
  ref: string;
}

const CLAIMS_REQUEST: FindItemsRequest = {
  kind: ['claim'],
  per_page: INVESTIGATION_LIMITS.maxPerPage,
  sort_field: 'created_at',
  sort_order: 'asc',
};

/** Claims that were created from a message, by message id, so messages can show "Pinned as C4". */
export const usePinnedClaims = (record: InvestigationRecord): Map<string, PinnedClaim> => {
  const { data } = useItems(record.id, CLAIMS_REQUEST);

  return useMemo(() => {
    const pinned = new Map<string, PinnedClaim>();
    (data?.items ?? []).forEach((item) => {
      if (item.kind !== 'claim') {
        return;
      }
      const messageId = item.claim.source_message?.message_id;
      if (messageId && !pinned.has(messageId)) {
        pinned.set(messageId, { claimId: item.id, ref: item.ref });
      }
    });
    return pinned;
  }, [data]);
};
