/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { mockCaseComments } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { collectRelatedAttachmentIds } from './related_deletions';
import { buildAttachmentTypeFilter } from './type_filter';

const PARENT_TYPE = 'test.parent';
const OTHER_PARENT_TYPE = 'test.other-parent';

const asType = (comment: (typeof mockCaseComments)[number], id: string, type: string) =>
  ({
    ...comment,
    id,
    attributes: { ...comment.attributes, type },
  } as unknown as (typeof mockCaseComments)[number]);

describe('collectRelatedAttachmentIds', () => {
  const parent = asType(mockCaseComments[0], 'parent-1', PARENT_TYPE);
  const otherParent = asType(mockCaseComments[3], 'other-parent-1', OTHER_PARENT_TYPE);
  const child = mockCaseComments[1];
  const unrelated = mockCaseComments[2];

  const setup = ({
    hook,
    otherHook,
  }: {
    hook?: jest.Mock;
    otherHook?: jest.Mock;
  } = {}) => {
    const clientArgs = createCasesClientMockArgs();
    clientArgs.unifiedAttachmentTypeRegistry.register({
      id: PARENT_TYPE,
      schema: z.object({}),
      relatedAttachments: hook != null ? { readTypes: ['test.child'], get: hook } : undefined,
    });
    clientArgs.unifiedAttachmentTypeRegistry.register({
      id: OTHER_PARENT_TYPE,
      schema: z.object({}),
      relatedAttachments:
        otherHook != null
          ? { readTypes: ['test.child', 'test.other-child'], get: otherHook }
          : undefined,
    });
    clientArgs.services.caseService.getAllCaseComments.mockResolvedValue({
      saved_objects: [parent, otherParent, child, unrelated].map((so) => ({ ...so, score: 0 })),
      total: 4,
      per_page: 100,
      page: 1,
    });
    return clientArgs;
  };

  it('does not read the case attachments when no deleted type has a hook', async () => {
    const clientArgs = setup();

    const related = await collectRelatedAttachmentIds({
      caseId: 'mock-id-1',
      attachments: [parent],
      clientArgs,
    });

    expect(related).toEqual([]);
    expect(clientArgs.services.caseService.getAllCaseComments).not.toHaveBeenCalled();
  });

  it('passes the deleted attachments of the type and the remaining ones to the hook', async () => {
    const hook = jest.fn().mockResolvedValue([]);
    const clientArgs = setup({ hook });

    await collectRelatedAttachmentIds({
      caseId: 'mock-id-1',
      attachments: [parent, unrelated],
      clientArgs,
    });

    expect(hook).toHaveBeenCalledWith({
      caseId: 'mock-id-1',
      request: clientArgs.request,
      attachments: [{ id: parent.id, attributes: parent.attributes }],
      remainingAttachments: [otherParent, child].map(({ id, attributes }) => ({ id, attributes })),
    });
  });

  it('calls a hook shared by 2 types once per type', async () => {
    const hook = jest.fn().mockResolvedValue([]);
    const clientArgs = setup({ hook, otherHook: hook });

    await collectRelatedAttachmentIds({
      caseId: 'mock-id-1',
      attachments: [parent, otherParent],
      clientArgs,
    });

    expect(hook).toHaveBeenCalledTimes(2);
    expect(hook.mock.calls.map(([{ attachments }]) => attachments)).toEqual([
      [{ id: parent.id, attributes: parent.attributes }],
      [{ id: otherParent.id, attributes: otherParent.attributes }],
    ]);
  });

  it('reads only the attachment types the deleting hooks declare', async () => {
    const hook = jest.fn().mockResolvedValue([]);
    const otherHook = jest.fn().mockResolvedValue([]);
    const clientArgs = setup({ hook, otherHook });

    await collectRelatedAttachmentIds({
      caseId: 'mock-id-1',
      attachments: [parent, otherParent],
      clientArgs,
    });

    expect(clientArgs.services.caseService.getAllCaseComments).toHaveBeenCalledWith({
      id: 'mock-id-1',
      options: { filter: buildAttachmentTypeFilter(['test.child', 'test.other-child']) },
    });
  });

  it('skips a deleted attachment whose attributes did not decode', async () => {
    const hook = jest.fn().mockResolvedValue([]);
    const clientArgs = setup({ hook });

    await collectRelatedAttachmentIds({
      caseId: 'mock-id-1',
      attachments: [{ id: 'undecodable-1' }, parent],
      clientArgs,
    });

    expect(hook).toHaveBeenCalledWith(
      expect.objectContaining({ attachments: [{ id: parent.id, attributes: parent.attributes }] })
    );
  });

  it('merges the ids of each type across hooks, without duplicates', async () => {
    const hook = jest.fn().mockResolvedValue([
      { type: 'test.child', attachmentIds: ['a', 'b'] },
      { type: 'test.empty', attachmentIds: [] },
    ]);
    const otherHook = jest.fn().mockResolvedValue([
      { type: 'test.child', attachmentIds: ['b', 'c'] },
      { type: 'test.other-child', attachmentIds: ['d'] },
    ]);
    const clientArgs = setup({ hook, otherHook });

    const related = await collectRelatedAttachmentIds({
      caseId: 'mock-id-1',
      attachments: [parent, otherParent],
      clientArgs,
    });

    expect(related).toEqual([
      { type: 'test.child', attachmentIds: ['a', 'b', 'c'] },
      { type: 'test.other-child', attachmentIds: ['d'] },
    ]);
  });

  it('propagates a hook failure', async () => {
    const hook = jest.fn().mockRejectedValue(new Error('hook failed'));
    const clientArgs = setup({ hook });

    await expect(
      collectRelatedAttachmentIds({ caseId: 'mock-id-1', attachments: [parent], clientArgs })
    ).rejects.toThrow('hook failed');
  });
});
