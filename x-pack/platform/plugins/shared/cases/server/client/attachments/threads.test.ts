/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_ATTACHMENT_SAVED_OBJECT } from '../../../common/constants';
import { COMMENT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import type { UnifiedAttachment } from '../../../common/types/domain';
import { createCasesClientMockArgs } from '../mocks';
import { addThreadReply } from './add';
import { get } from './get';
import { addReply, getReplyCounts } from './threads';

jest.mock('./add');
jest.mock('./get', () => ({
  get: jest.fn(),
  decodeUnifiedAttachment: (attachment: unknown) => attachment,
}));
jest.mock('../../authorization/utils', () => ({
  ...jest.requireActual('../../authorization/utils'),
  getAttachmentAuthorizationFilter: jest.fn().mockResolvedValue({
    filter: undefined,
    ensureSavedObjectsAreAuthorized: jest.fn(),
    authorizedOwners: undefined,
  }),
}));

const getMock = get as jest.Mock;
const addThreadReplyMock = addThreadReply as jest.Mock;

const createComment = (overrides: Partial<UnifiedAttachment> = {}): UnifiedAttachment =>
  ({
    id: 'comment-1',
    version: 'WzEsMV0=',
    type: COMMENT_ATTACHMENT_TYPE,
    owner: 'securitySolution',
    data: { content: 'hello' },
    created_at: '2026-11-01T00:00:00.000Z',
    created_by: { username: 'author', full_name: null, email: null, profile_uid: 'author-uid' },
    pushed_at: null,
    pushed_by: null,
    updated_at: null,
    updated_by: null,
    ...overrides,
  } as UnifiedAttachment);

describe('threads', () => {
  const clientArgs = createCasesClientMockArgs();
  const { caseService } = clientArgs.services;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addReply', () => {
    it('adds the reply with the owner of the parent', async () => {
      getMock.mockResolvedValue(createComment());

      await addReply({ caseId: 'case-1', parentId: 'comment-1', content: 'a reply' }, clientArgs);

      expect(addThreadReplyMock).toHaveBeenCalledWith(
        {
          caseId: 'case-1',
          parentId: 'comment-1',
          comment: {
            type: COMMENT_ATTACHMENT_TYPE,
            owner: 'securitySolution',
            data: { content: 'a reply' },
          },
        },
        clientArgs
      );
    });

    it.each([
      ['a reply', { parent_id: 'other' }, 'You cannot reply to a reply.'],
      ['an attachment that is not a comment', { type: 'lens' }, 'Only comments can have replies.'],
    ])('rejects a reply to %s', async (_, overrides, message) => {
      getMock.mockResolvedValue(createComment(overrides as Partial<UnifiedAttachment>));

      await expect(
        addReply({ caseId: 'case-1', parentId: 'comment-1', content: 'a reply' }, clientArgs)
      ).rejects.toThrow(message);
      expect(addThreadReplyMock).not.toHaveBeenCalled();
    });
  });

  describe('getReplyCounts', () => {
    it('returns the counts, latest distinct repliers and last reply time per thread', async () => {
      const jane = { username: 'jane', full_name: 'Jane', email: null, profile_uid: 'jane-uid' };
      const john = { username: 'john', full_name: 'John', email: null, profile_uid: 'john-uid' };
      const toHit = (createdBy: typeof jane, createdAt: string) => ({
        _source: {
          [CASE_ATTACHMENT_SAVED_OBJECT]: { created_by: createdBy, created_at: createdAt },
        },
      });
      caseService.getCase.mockResolvedValue({ attributes: { owner: 'securitySolution' } } as never);
      clientArgs.unsecuredSavedObjectsClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 0,
        aggregations: {
          parents: {
            buckets: [
              {
                key: 'comment-1',
                doc_count: 3,
                latest: {
                  hits: {
                    hits: [
                      toHit(jane, '2026-11-03T00:00:00.000Z'),
                      toHit(john, '2026-11-02T00:00:00.000Z'),
                      toHit(jane, '2026-11-01T00:00:00.000Z'),
                    ],
                  },
                },
              },
            ],
          },
        },
      });

      expect(await getReplyCounts({ caseId: 'case-1' }, clientArgs)).toEqual({
        counts: { 'comment-1': 3 },
        threads: {
          'comment-1': { lastReplyAt: '2026-11-03T00:00:00.000Z', participants: [jane, john] },
        },
      });
    });
  });
});
