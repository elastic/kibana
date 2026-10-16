/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { COMMENT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import { mockCaseComments } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { getRelatedAttachmentsToDelete } from './related_deletions';

const PARENT_TYPE = 'test.parent';

const asType = (comment: (typeof mockCaseComments)[number], id: string, type: string) =>
  ({
    ...comment,
    id,
    attributes: { ...comment.attributes, type },
  } as unknown as (typeof mockCaseComments)[number]);

describe('getRelatedAttachmentsToDelete', () => {
  const parent = asType(mockCaseComments[0], 'parent-1', PARENT_TYPE);
  const child = mockCaseComments[1];
  const unrelated = mockCaseComments[2];

  const setup = (onDelete?: jest.Mock) => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.unifiedAttachmentTypeRegistry.register({
      id: PARENT_TYPE,
      schema: z.object({}),
      onDelete,
    });
    clientArgs.services.caseService.getAllCaseComments.mockResolvedValue({
      saved_objects: [parent, child, unrelated].map((so) => ({ ...so, score: 0 })),
      total: 3,
      per_page: 100,
      page: 1,
    });
    return clientArgs;
  };

  it('does not read the case attachments when no deleted type has an onDelete hook', async () => {
    const clientArgs = setup();

    const related = await getRelatedAttachmentsToDelete({
      caseId: 'mock-id-1',
      attachments: [parent],
      clientArgs,
    });

    expect(related).toEqual({ refs: [], updates: [] });
    expect(clientArgs.services.caseService.getAllCaseComments).not.toHaveBeenCalled();
  });

  it('passes the deleted attachments of the type and the remaining ones to the hook', async () => {
    const onDelete = jest.fn().mockResolvedValue({ relatedAttachmentIds: [] });
    const clientArgs = setup(onDelete);

    await getRelatedAttachmentsToDelete({
      caseId: 'mock-id-1',
      attachments: [parent, unrelated],
      clientArgs,
    });

    expect(onDelete).toHaveBeenCalledWith({
      caseId: 'mock-id-1',
      request: clientArgs.request,
      attachments: [{ id: parent.id, attributes: parent.attributes }],
      remainingAttachments: [{ id: child.id, attributes: child.attributes }],
    });
  });

  it('returns only remaining attachments of the case that the hook names', async () => {
    const onDelete = jest.fn().mockResolvedValue({
      relatedAttachmentIds: [child.id, parent.id, 'not-on-the-case'],
    });
    const clientArgs = setup(onDelete);

    const related = await getRelatedAttachmentsToDelete({
      caseId: 'mock-id-1',
      attachments: [parent],
      clientArgs,
    });

    expect(related).toEqual({ refs: [{ id: child.id, type: child.type }], updates: [] });
  });

  it('skips a deleted attachment whose attributes did not decode', async () => {
    const onDelete = jest.fn().mockResolvedValue({ relatedAttachmentIds: [] });
    const clientArgs = setup(onDelete);

    const related = await getRelatedAttachmentsToDelete({
      caseId: 'mock-id-1',
      attachments: [{ id: 'undecodable-1' }, parent],
      clientArgs,
    });

    expect(related).toEqual({ refs: [], updates: [] });
    expect(onDelete).toHaveBeenCalledWith(
      expect.objectContaining({ attachments: [{ id: parent.id, attributes: parent.attributes }] })
    );
  });

  describe('updates', () => {
    const shrunkChild = {
      id: child.id,
      payload: {
        type: child.attributes.type,
        owner: child.attributes.owner,
        data: { content: 'shorter' },
      },
    };

    it('returns the attachments the hook shrinks alongside the ones it takes', async () => {
      const onDelete = jest.fn().mockResolvedValue({
        relatedAttachmentIds: [unrelated.id],
        relatedAttachmentUpdates: [shrunkChild],
      });
      const clientArgs = setup(onDelete);

      const related = await getRelatedAttachmentsToDelete({
        caseId: 'mock-id-1',
        attachments: [parent],
        clientArgs,
      });

      expect(related).toEqual({
        refs: [{ id: unrelated.id, type: unrelated.type }],
        updates: [{ id: child.id, type: child.type, payload: shrunkChild.payload }],
      });
    });

    it('deletes an attachment the hook both takes and shrinks', async () => {
      const onDelete = jest.fn().mockResolvedValue({
        relatedAttachmentIds: [child.id],
        relatedAttachmentUpdates: [shrunkChild],
      });
      const clientArgs = setup(onDelete);

      const related = await getRelatedAttachmentsToDelete({
        caseId: 'mock-id-1',
        attachments: [parent],
        clientArgs,
      });

      expect(related).toEqual({ refs: [{ id: child.id, type: child.type }], updates: [] });
    });

    it('returns only updates for remaining attachments of the case', async () => {
      const onDelete = jest.fn().mockResolvedValue({
        relatedAttachmentIds: [],
        relatedAttachmentUpdates: [
          { ...shrunkChild, id: 'not-on-the-case' },
          { ...shrunkChild, id: parent.id },
        ],
      });
      const clientArgs = setup(onDelete);

      const related = await getRelatedAttachmentsToDelete({
        caseId: 'mock-id-1',
        attachments: [parent],
        clientArgs,
      });

      expect(related).toEqual({ refs: [], updates: [] });
    });

    it('drops an update that changes the type of the attachment', async () => {
      const onDelete = jest.fn().mockResolvedValue({
        relatedAttachmentIds: [],
        relatedAttachmentUpdates: [
          { ...shrunkChild, payload: { ...shrunkChild.payload, type: COMMENT_ATTACHMENT_TYPE } },
        ],
      });
      const clientArgs = setup(onDelete);

      const related = await getRelatedAttachmentsToDelete({
        caseId: 'mock-id-1',
        attachments: [parent],
        clientArgs,
      });

      expect(related).toEqual({ refs: [], updates: [] });
    });

    it('keeps the stored owner when the hook supplies another one', async () => {
      const onDelete = jest.fn().mockResolvedValue({
        relatedAttachmentIds: [],
        relatedAttachmentUpdates: [
          { ...shrunkChild, payload: { ...shrunkChild.payload, owner: 'observability' } },
        ],
      });
      const clientArgs = setup(onDelete);

      const related = await getRelatedAttachmentsToDelete({
        caseId: 'mock-id-1',
        attachments: [parent],
        clientArgs,
      });

      expect(related.updates).toEqual([
        { id: child.id, type: child.type, payload: shrunkChild.payload },
      ]);
      expect(related.updates[0].payload.owner).toBe(child.attributes.owner);
    });

    it('returns a single update, from the last hook, when two hooks shrink the same attachment', async () => {
      const otherType = 'test.other';
      const lastPayload = { ...shrunkChild.payload, data: { content: 'shortest' } };
      const onDelete = jest.fn().mockResolvedValue({
        relatedAttachmentIds: [],
        relatedAttachmentUpdates: [shrunkChild],
      });
      const otherOnDelete = jest.fn().mockResolvedValue({
        relatedAttachmentIds: [],
        relatedAttachmentUpdates: [{ id: child.id, payload: lastPayload }],
      });
      const clientArgs = setup(onDelete);
      clientArgs.unifiedAttachmentTypeRegistry.register({
        id: otherType,
        schema: z.object({}),
        onDelete: otherOnDelete,
      });

      const related = await getRelatedAttachmentsToDelete({
        caseId: 'mock-id-1',
        attachments: [parent, asType(unrelated, unrelated.id, otherType)],
        clientArgs,
      });

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(otherOnDelete).toHaveBeenCalledTimes(1);
      expect(related.updates).toEqual([{ id: child.id, type: child.type, payload: lastPayload }]);
    });
  });
});
