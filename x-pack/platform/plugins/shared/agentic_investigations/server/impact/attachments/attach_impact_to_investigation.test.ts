/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import {
  createAttachmentAlreadyExistsError,
  createConversationNotFoundError,
} from '@kbn/agent-builder-common';
import type { AttachmentPublicClient, ConversationPublicClient } from '@kbn/agent-builder-server';
import { IMPACT_ATTACHMENT_TYPE } from '../../../common/impact/attachment';
import type { Impact } from '../../../common/impact/impact';
import { attachImpactToInvestigation } from './attach_impact_to_investigation';

const impact: Impact = {
  id: 'impact-1',
  spaceId: 'default',
  conversationId: 'conv-1',
  entities: [{ id: 'host-1' }],
  createdAt: '2026-09-01T00:00:00.000Z',
};

const ownerConversations = () =>
  ({
    get: vi.fn().mockResolvedValue({ permissions: { update_access_control: true } }),
  } as unknown as ConversationPublicClient & { get: Mock });

const run = ({
  attachments,
  conversations = ownerConversations(),
  readImpact = vi.fn().mockResolvedValue(impact),
  writeImpact = vi.fn().mockResolvedValue({ written: impact }),
  revertImpact = vi.fn().mockResolvedValue(undefined),
}: {
  attachments: AttachmentPublicClient;
  conversations?: ConversationPublicClient;
  readImpact?: Mock;
  writeImpact?: Mock;
  revertImpact?: Mock;
}) =>
  attachImpactToInvestigation({
    attachments,
    conversations,
    conversationId: 'conv-1',
    readImpact,
    writeImpact,
    revertImpact,
  });

describe('attachImpactToInvestigation', () => {
  it('writes impact only after the caller is the conversation owner, then creates the attachment', async () => {
    const conversations = ownerConversations();
    const writeImpact = vi.fn().mockResolvedValue({ written: impact });
    const create = vi.fn().mockResolvedValue({ id: 'impact-1' });

    await run({
      conversations,
      writeImpact,
      attachments: { create } as unknown as AttachmentPublicClient,
    });

    expect(conversations.get).toHaveBeenCalledWith('conv-1');
    expect(conversations.get.mock.invocationCallOrder[0]).toBeLessThan(
      writeImpact.mock.invocationCallOrder[0]
    );
    expect(create).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      id: 'impact-1',
      type: IMPACT_ATTACHMENT_TYPE,
      origin: 'impact-1',
      data: impact,
    });
    expect(writeImpact.mock.invocationCallOrder[0]).toBeLessThan(
      create.mock.invocationCallOrder[0]
    );
  });

  it('does not write impact when the conversation is missing or not owned', async () => {
    const writeImpact = vi.fn();
    const conversations = {
      get: vi.fn().mockRejectedValue(createConversationNotFoundError({ conversationId: 'conv-1' })),
    } as unknown as ConversationPublicClient;

    await expect(
      run({
        conversations,
        writeImpact,
        attachments: { create: vi.fn() } as unknown as AttachmentPublicClient,
      })
    ).rejects.toMatchObject({ code: 'conversationNotFound' });
    expect(writeImpact).not.toHaveBeenCalled();
  });

  it('updates the existing attachment when the conversation already has one', async () => {
    const update = vi.fn().mockResolvedValue({ id: 'impact-1' });
    const attachments = {
      create: vi
        .fn()
        .mockRejectedValue(createAttachmentAlreadyExistsError({ attachmentId: 'impact-1' })),
      get: vi.fn().mockResolvedValue({ id: 'impact-1', active: true }),
      delete: vi.fn(),
      update,
    };

    await run({ attachments: attachments as unknown as AttachmentPublicClient });

    expect(attachments.delete).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      attachmentId: 'impact-1',
      data: impact,
    });
  });

  it('leaves a soft-deleted attachment in place and still returns the impact', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(createAttachmentAlreadyExistsError({ attachmentId: 'impact-1' }));
    const deleteAttachment = vi.fn();
    const update = vi.fn();
    const revertImpact = vi.fn().mockResolvedValue(undefined);
    const attachments = {
      create,
      get: vi.fn().mockResolvedValue({ id: 'impact-1', active: false }),
      delete: deleteAttachment,
      update,
    };

    const result = await run({
      attachments: attachments as unknown as AttachmentPublicClient,
      revertImpact,
    });

    expect(deleteAttachment).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(1);
    expect(revertImpact).not.toHaveBeenCalled();
    expect(result).toEqual(impact);
  });

  it('reverts to the document the successful write overwrote', async () => {
    const previous: Impact = { ...impact, entities: [{ id: 'user-1' }] };
    const writeImpact = vi.fn().mockResolvedValue({ written: impact, previous });
    const revertImpact = vi.fn().mockResolvedValue(undefined);
    const readImpact = vi.fn().mockResolvedValue(impact);

    await expect(
      run({
        readImpact,
        writeImpact,
        revertImpact,
        attachments: {
          create: vi.fn().mockRejectedValue(new Error('conversation write failed')),
        } as unknown as AttachmentPublicClient,
      })
    ).rejects.toThrow('conversation write failed');

    expect(revertImpact).toHaveBeenCalledWith({ written: impact, previous });
  });

  it('stamps the impact document read after a concurrent merge', async () => {
    const merged: Impact = {
      ...impact,
      entities: [{ id: 'host-1' }, { id: 'user-2' }],
    };
    const writeImpact = vi.fn().mockResolvedValue({ written: impact });
    const readImpact = vi.fn().mockResolvedValue(merged);
    const revertImpact = vi.fn().mockResolvedValue(undefined);
    const update = vi.fn().mockResolvedValue({ id: 'impact-1' });
    const attachments = {
      create: vi
        .fn()
        .mockRejectedValue(createAttachmentAlreadyExistsError({ attachmentId: 'impact-1' })),
      get: vi.fn().mockResolvedValue({ id: 'impact-1', active: true }),
      delete: vi.fn(),
      update,
    };

    const result = await run({
      attachments: attachments as unknown as AttachmentPublicClient,
      readImpact,
      writeImpact,
      revertImpact,
    });

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      attachmentId: 'impact-1',
      data: merged,
    });
    expect(result).toEqual(merged);
    expect(revertImpact).not.toHaveBeenCalled();
  });

  it('stamps again when a concurrent merge lands during the attachment update', async () => {
    const merged: Impact = {
      ...impact,
      entities: [{ id: 'host-1' }, { id: 'user-2' }],
    };
    const writeImpact = vi.fn().mockResolvedValue({ written: impact });
    const readImpact = vi.fn().mockResolvedValueOnce(impact).mockResolvedValue(merged);
    const update = vi.fn().mockResolvedValue({ id: 'impact-1' });
    const attachments = {
      create: vi
        .fn()
        .mockRejectedValue(createAttachmentAlreadyExistsError({ attachmentId: 'impact-1' })),
      get: vi.fn().mockResolvedValue({ id: 'impact-1', active: true }),
      delete: vi.fn(),
      update,
    };

    const result = await run({
      attachments: attachments as unknown as AttachmentPublicClient,
      readImpact,
      writeImpact,
    });

    expect(update).toHaveBeenNthCalledWith(1, {
      conversationId: 'conv-1',
      attachmentId: 'impact-1',
      data: impact,
    });
    expect(update).toHaveBeenLastCalledWith({
      conversationId: 'conv-1',
      attachmentId: 'impact-1',
      data: merged,
    });
    expect(result).toEqual(merged);
  });
});
