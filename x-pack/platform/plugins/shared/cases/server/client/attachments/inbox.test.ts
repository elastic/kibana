/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_ATTACHMENT_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';
import { COMMENT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import type { UnifiedAttachment, User } from '../../../common/types/domain';
import { createCasesClientMockArgs } from '../mocks';
import { findInbox } from './inbox';

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

const me = { username: 'me', full_name: 'Me', email: 'me@elastic.co', profile_uid: 'me-uid' };
const other = { username: 'other', full_name: null, email: null, profile_uid: 'other-uid' };

const createComment = (overrides: Partial<UnifiedAttachment> = {}): UnifiedAttachment =>
  ({
    id: 'comment-1',
    version: 'WzEsMV0=',
    type: COMMENT_ATTACHMENT_TYPE,
    owner: 'securitySolution',
    data: { content: 'hello' },
    created_at: '2026-11-01T00:00:00.000Z',
    created_by: other,
    pushed_at: null,
    pushed_by: null,
    updated_at: null,
    updated_by: null,
    ...overrides,
  } as UnifiedAttachment);

const toFindResponse = (attachments: UnifiedAttachment[]) => ({
  saved_objects: attachments.map(({ id, version, ...attributes }) => ({
    id,
    version,
    type: CASE_ATTACHMENT_SAVED_OBJECT,
    attributes,
    references: [{ type: CASE_SAVED_OBJECT, name: 'associated-cases', id: 'case-1' }],
    score: 0,
  })),
  total: attachments.length,
  page: 1,
  per_page: attachments.length,
});

const createAssignment = (id: string, createdBy: User, createdAt: string) => ({
  id,
  type: 'cases-user-actions',
  references: [{ type: CASE_SAVED_OBJECT, name: 'associated-cases', id: 'case-1' }],
  attributes: { owner: 'securitySolution', created_at: createdAt, created_by: createdBy },
});

describe('findInbox', () => {
  const clientArgs = createCasesClientMockArgs();
  const { attachmentService, caseService, userActionService } = clientArgs.services;

  const mockAttachments = ({
    mentions,
    replies,
  }: {
    mentions: UnifiedAttachment[];
    replies: UnifiedAttachment[];
  }) =>
    attachmentService.find.mockImplementation(async ({ options }) =>
      toFindResponse(JSON.stringify(options?.filter).includes('mentions') ? mentions : replies)
    );

  beforeEach(() => {
    jest.clearAllMocks();
    clientArgs.user = { ...me };
    caseService.getCases.mockResolvedValue({
      saved_objects: [{ id: 'case-1', attributes: { title: 'Case one' } }],
    } as never);
    userActionService.finder.findAssignments.mockResolvedValue([]);
  });

  it('returns mentions, replies to my comments and assignments, newest first', async () => {
    mockAttachments({
      mentions: [
        createComment({ id: 'mention-1', created_at: '2026-11-03T00:00:00.000Z' }),
        createComment({ id: 'my-mention', created_by: me }),
      ],
      replies: [
        createComment({ id: 'reply-1', parent_id: 'mine', created_at: '2026-11-02T00:00:00.000Z' }),
        createComment({ id: 'my-reply', parent_id: 'mine', created_by: me }),
      ],
    });
    attachmentService.getter.bulkGet.mockResolvedValue({
      saved_objects: [{ id: 'mine', attributes: { created_by: me } }],
    } as never);
    userActionService.finder.findAssignments.mockResolvedValue([
      createAssignment('assigned-1', other, '2026-11-04T00:00:00.000Z'),
      createAssignment('self-assigned', me, '2026-11-05T00:00:00.000Z'),
    ] as never);

    const { items } = await findInbox({ owners: [] }, clientArgs);

    expect(userActionService.finder.findAssignments).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'me-uid' })
    );
    expect(
      items.map(({ id, reason, commentId, threadId, caseTitle }) => ({
        id,
        reason,
        commentId,
        threadId,
        caseTitle,
      }))
    ).toEqual([
      {
        id: 'assigned-1',
        reason: 'assignment',
        commentId: undefined,
        threadId: undefined,
        caseTitle: 'Case one',
      },
      {
        id: 'mention-1',
        reason: 'mention',
        commentId: 'mention-1',
        threadId: undefined,
        caseTitle: 'Case one',
      },
      {
        id: 'reply-1',
        reason: 'reply',
        commentId: 'mine',
        threadId: 'mine',
        caseTitle: 'Case one',
      },
    ]);
  });

  it('lists a reply that also mentions me once, as a mention', async () => {
    const reply = createComment({ id: 'reply-1', parent_id: 'mine' });
    mockAttachments({ mentions: [reply], replies: [reply] });
    attachmentService.getter.bulkGet.mockResolvedValue({
      saved_objects: [{ id: 'mine', attributes: { created_by: me } }],
    } as never);

    const { items } = await findInbox({ owners: [] }, clientArgs);

    expect(items.map(({ id, reason, threadId }) => ({ id, reason, threadId }))).toEqual([
      { id: 'reply-1', reason: 'mention', threadId: 'mine' },
    ]);
  });

  it('only queries the requested owners', async () => {
    mockAttachments({ mentions: [], replies: [] });

    await findInbox({ owners: ['securitySolution'] }, clientArgs);

    const filters = attachmentService.find.mock.calls.map(([{ options }]) =>
      JSON.stringify(options?.filter)
    );
    expect(filters).toHaveLength(2);
    filters.forEach((filter) => expect(filter).toContain('securitySolution'));
    expect(
      JSON.stringify(userActionService.finder.findAssignments.mock.calls[0][0].filter)
    ).toContain('securitySolution');
  });

  it('returns nothing for a user without a profile', async () => {
    const { profile_uid: _, ...userWithoutProfile } = me;
    clientArgs.user = userWithoutProfile as typeof clientArgs.user;

    expect(await findInbox({ owners: [] }, clientArgs)).toEqual({ items: [] });
    expect(attachmentService.find).not.toHaveBeenCalled();
    expect(userActionService.finder.findAssignments).not.toHaveBeenCalled();
  });
});
