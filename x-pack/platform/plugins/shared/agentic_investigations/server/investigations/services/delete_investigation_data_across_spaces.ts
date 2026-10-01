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
  deleteAllClaims,
}: DeleteInvestigationDataAcrossSpacesDeps): Promise<DeleteInvestigationDataAcrossSpacesResult> => {
  const result: DeleteInvestigationDataAcrossSpacesResult = {
    investigations: 0,
    subjects: 0,
    subjectClaims: 0,
    impact: 0,
    hypotheses: 0,
  };

  for (let round = 0; round < MAX_DELETE_ROUNDS; round++) {
    const conversations = await subjects.findConversationsAcrossSpaces();
    if (conversations.length === 0) {
      break;
    }
    result.investigations += conversations.length;
    const bySpace = groupBy(conversations, ({ spaceId }) => spaceId);
    for (const [spaceId, inSpace] of Object.entries(bySpace)) {
      const ids = inSpace.map(({ conversationId }) => conversationId);
      // Subjects last: they are how the next round finds what is left.
      result.impact += await impact.deleteByConversationIds(ids, spaceId);
      result.hypotheses += await hypotheses.deleteByConversationIds(ids, spaceId);
      result.subjects += await subjects.deleteByConversationIds(ids, spaceId);
    }
  }

  result.subjectClaims = await deleteAllClaims();
  return result;
};
