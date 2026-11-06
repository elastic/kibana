/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy } from 'lodash';
import type { InvestigationAttachmentDocService } from '../../investigation_attachments';
import type { StoredInvestigationAttachment } from '../../../common/investigation_attachments';
import type { DeleteInvestigationDataResult } from './investigations_client';

/** Bounds the work if subjects are written faster than they are removed. */
const MAX_DELETE_ROUNDS = 100;

/** What the cross-space delete removed: the documents per index, and the investigations they held. */
export interface DeleteInvestigationDataAcrossSpacesResult extends DeleteInvestigationDataResult {
  /** Investigations (conversations) whose data was removed. */
  investigations: number;
  /**
   * False when the delete stopped at its round bound with subject documents left. Those
   * investigations keep all their data, including their subject claims; run the delete again.
   */
  complete: boolean;
}

type DocumentService = Pick<
  InvestigationAttachmentDocService<StoredInvestigationAttachment>,
  'deleteByConversationIds'
>;

export interface DeleteInvestigationDataAcrossSpacesDeps {
  subjects: Pick<
    InvestigationAttachmentDocService<StoredInvestigationAttachment>,
    'findConversationsAcrossSpaces' | 'deleteByConversationIds'
  >;
  impact: DocumentService;
  hypotheses: DocumentService;
  /** Removes the claims the given investigations hold in the space. */
  deleteClaims: (conversationIds: string[], spaceId: string) => Promise<number>;
  /** Removes every claim in every space, including claims of investigations without subjects. */
  deleteAllClaims: () => Promise<number>;
}

/**
 * Maintenance: removes the side-index data of every investigation that has subjects, in every
 * space. Investigations without subjects (for example ones a solution only attached impact to)
 * keep their data, because the impact index is shared across solutions. Conversations belong to
 * Agent Builder and are left alone. Callers authorize this themselves: it runs as the internal
 * user and takes no request.
 */
export const deleteInvestigationDataAcrossSpaces = async ({
  subjects,
  impact,
  hypotheses,
  deleteClaims,
  deleteAllClaims,
}: DeleteInvestigationDataAcrossSpacesDeps): Promise<DeleteInvestigationDataAcrossSpacesResult> => {
  const result: DeleteInvestigationDataAcrossSpacesResult = {
    investigations: 0,
    subjects: 0,
    subjectClaims: 0,
    impact: 0,
    hypotheses: 0,
    complete: false,
  };

  for (let round = 0; round < MAX_DELETE_ROUNDS; round++) {
    const conversations = await subjects.findConversationsAcrossSpaces();
    if (conversations.length === 0) {
      result.complete = true;
      break;
    }
    result.investigations += conversations.length;
    const bySpace = groupBy(conversations, ({ spaceId }) => spaceId);
    for (const [spaceId, inSpace] of Object.entries(bySpace)) {
      const ids = inSpace.map(({ conversationId }) => conversationId);
      // Subjects last: they are how the next round finds what is left.
      result.impact += await impact.deleteByConversationIds(ids, spaceId);
      result.hypotheses += await hypotheses.deleteByConversationIds(ids, spaceId);
      result.subjectClaims += await deleteClaims(ids, spaceId);
      result.subjects += await subjects.deleteByConversationIds(ids, spaceId);
    }
  }

  // Only once no subject documents are left: every remaining claim then belongs to no
  // investigation that is kept. Stopping early must not release the claims of investigations
  // that still hold their subjects.
  if (result.complete) {
    result.subjectClaims += await deleteAllClaims();
  }
  return result;
};
