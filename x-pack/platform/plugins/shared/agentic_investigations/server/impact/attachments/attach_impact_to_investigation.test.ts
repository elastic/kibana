/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createAttachmentAlreadyExistsError,
  createConversationNotFoundError,
} from '@kbn/agent-builder-common';
import type { AttachmentPublicClient, ConversationPublicClient } from '@kbn/agent-builder-server';
import { IMPACT_ATTACHMENT_TYPE } from '../../../common/impact/attachment';
import type { Impact } from '../../../common/impact/impact';
import { ImpactNotFoundError } from '../services/errors';
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
    get: jest.fn().mockResolvedValue({ permissions: { update_access_control: true } }),
  } as unknown as ConversationPublicClient & { get: jest.Mock });

const run = ({
  attachments,
  conversations = ownerConversations(),
  readImpact = jest
    .fn()
    .mockResolvedValue(impact)
    .mockRejectedValueOnce(new ImpactNotFoundError('conv-1')),
  writeImpact = jest.fn().mockResolvedValue(impact),
  revertImpact = jest.fn().mockResolvedValue(undefined),
}: {
  attachments: AttachmentPublicClient;
  conversations?: ConversationPublicClient;
  readImpact?: jest.Mock;
  writeImpact?: jest.Mock;
  revertImpact?: jest.Mock;
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
    const writeImpact = jest.fn().mockResolvedValue(impact);
    const create = jest.fn().mockResolvedValue({ id: 'impact-1' });

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
    const writeImpact = jest.fn();
    const conversations = {
      get: jest
        .fn()
        .mockRejectedValue(createConversationNotFoundError({ conversationId: 'conv-1' })),
    } as unknown as ConversationPublicClient;

    await expect(
      run({
        conversations,
        writeImpact,
        attachments: { create: jest.fn() } as unknown as AttachmentPublicClient,
      })
    ).rejects.toMatchObject({ code: 'conversationNotFound' });
    expect(writeImpact).not.toHaveBeenCalled();
  });

  it('updates the existing attachment when the conversation already has one', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'impact-1' });
    const attachments = {
      create: jest
        .fn()
        .mockRejectedValue(createAttachmentAlreadyExistsError({ attachmentId: 'impact-1' })),
      get: jest.fn().mockResolvedValue({ id: 'impact-1', active: true }),
      delete: jest.fn(),
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
    const create = jest
      .fn()
      .mockRejectedValueOnce(createAttachmentAlreadyExistsError({ attachmentId: 'impact-1' }));
    const deleteAttachment = jest.fn();
    const update = jest.fn();
    const revertImpact = jest.fn().mockResolvedValue(undefined);
    const attachments = {
      create,
      get: jest.fn().mockResolvedValue({ id: 'impact-1', active: false }),
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

  it('reverts the index write when the attachment cannot be put on the conversation', async () => {
    const previous: Impact = { ...impact, entities: [{ id: 'user-1' }] };
    const writeImpact = jest.fn().mockResolvedValue(impact);
    const revertImpact = jest.fn().mockResolvedValue(undefined);
    const readImpact = jest.fn().mockResolvedValueOnce(previous).mockResolvedValue(impact);

    await expect(
      run({
        readImpact,
        writeImpact,
        revertImpact,
        attachments: {
          create: jest.fn().mockRejectedValue(new Error('conversation write failed')),
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
    const writeImpact = jest.fn().mockResolvedValue(impact);
    const readImpact = jest
      .fn()
      .mockResolvedValue(merged)
      .mockRejectedValueOnce(new ImpactNotFoundError('conv-1'));
    const revertImpact = jest.fn().mockResolvedValue(undefined);
    const update = jest.fn().mockResolvedValue({ id: 'impact-1' });
    const attachments = {
      create: jest
        .fn()
        .mockRejectedValue(createAttachmentAlreadyExistsError({ attachmentId: 'impact-1' })),
      get: jest.fn().mockResolvedValue({ id: 'impact-1', active: true }),
      delete: jest.fn(),
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
    const writeImpact = jest.fn().mockResolvedValue(impact);
    const readImpact = jest
      .fn()
      .mockResolvedValue(merged)
      .mockRejectedValueOnce(new ImpactNotFoundError('conv-1'))
      .mockResolvedValueOnce(impact);
    const update = jest.fn().mockResolvedValue({ id: 'impact-1' });
    const attachments = {
      create: jest
        .fn()
        .mockRejectedValue(createAttachmentAlreadyExistsError({ attachmentId: 'impact-1' })),
      get: jest.fn().mockResolvedValue({ id: 'impact-1', active: true }),
      delete: jest.fn(),
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
