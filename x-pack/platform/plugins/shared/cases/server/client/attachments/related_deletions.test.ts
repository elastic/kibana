/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
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

    expect(related).toEqual([]);
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

    expect(related.map(({ id }) => id)).toEqual([child.id]);
  });
});
