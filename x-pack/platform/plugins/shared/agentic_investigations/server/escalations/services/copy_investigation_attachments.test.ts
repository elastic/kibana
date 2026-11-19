/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ConversationWithPermissions, VersionedAttachment } from '@kbn/agent-builder-common';
import type { AttachmentPublicClient } from '@kbn/agent-builder-server';
import { copyInvestigationAttachments } from './copy_investigation_attachments';

const makeAttachment = (overrides: Partial<VersionedAttachment> = {}): VersionedAttachment =>
  ({
    id: 'att1',
    type: 'text',
    current_version: 1,
    versions: [
      {
        version: 1,
        data: { text: 'hello' },
        created_at: '2026-01-01T00:00:00.000Z',
        content_hash: 'h1',
        estimated_tokens: 2,
      },
    ],
    active: true,
    ...overrides,
  } as VersionedAttachment);

const makeConversation = (
  id: string,
  attachments: VersionedAttachment[] = []
): ConversationWithPermissions =>
  ({
    id,
    title: `Conversation ${id}`,
    attachments,
    permissions: {},
  } as unknown as ConversationWithPermissions);

const buildDeps = () => {
  const logger = {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;

  const attachmentsClient = {
    bulkCreate: jest.fn(),
  } as unknown as AttachmentPublicClient;

  return { logger, attachmentsClient };
};

describe('copyInvestigationAttachments', () => {
  it('copies active, non-screen_context attachments to the escalation', async () => {
    const { logger, attachmentsClient } = buildDeps();
    const att = makeAttachment({ id: 'att1', type: 'text' });
    const investigation = makeConversation('inv-1', [att]);
    const escalation = makeConversation('esc-1');

    (attachmentsClient.bulkCreate as jest.Mock).mockResolvedValue({ created: [att], errors: [] });

    const result = await copyInvestigationAttachments({
      attachmentsClient,
      escalation,
      investigation,
      logger,
    });

    expect(result).toEqual({ copied: 1, failed: 0 });
    expect(attachmentsClient.bulkCreate).toHaveBeenCalledWith({
      conversationId: 'esc-1',
      attachments: [
        expect.objectContaining({
          id: 'inv-1:att1',
          type: 'text',
          data: { text: 'hello' },
        }),
      ],
      render_inline: true,
    });
  });

  it('skips deleted attachments', async () => {
    const { logger, attachmentsClient } = buildDeps();
    const active = makeAttachment({ id: 'active' });
    const deleted = makeAttachment({ id: 'deleted', active: false });
    const investigation = makeConversation('inv-1', [active, deleted]);
    const escalation = makeConversation('esc-1');

    (attachmentsClient.bulkCreate as jest.Mock).mockResolvedValue({
      created: [active],
      errors: [],
    });

    const result = await copyInvestigationAttachments({
      attachmentsClient,
      escalation,
      investigation,
      logger,
    });

    expect(result.copied).toBe(1);
    const call = (attachmentsClient.bulkCreate as jest.Mock).mock.calls[0][0];
    expect(call.attachments).toHaveLength(1);
    expect(call.attachments[0].id).toBe('inv-1:active');
  });

  it('excludes notification routing from escalation copies', async () => {
    const attachmentsClient = { bulkCreate: jest.fn() } as never;
    const routing = makeAttachment({ id: 'routing', type: 'nightshift.notification_routing' });
    const result = await copyInvestigationAttachments({
      attachmentsClient,
      escalation: makeConversation('escalation'),
      investigation: makeConversation('investigation', [routing]),
      logger: buildDeps().logger,
    });
    expect(result).toEqual({ copied: 0, failed: 0 });
  });

  it('skips screen_context attachments', async () => {
    const { logger, attachmentsClient } = buildDeps();
    const sc = makeAttachment({ id: 'sc', type: 'screen_context' });
    const text = makeAttachment({ id: 'txt', type: 'text' });
    const investigation = makeConversation('inv-1', [sc, text]);
    const escalation = makeConversation('esc-1');

    (attachmentsClient.bulkCreate as jest.Mock).mockResolvedValue({
      created: [text],
      errors: [],
    });

    const result = await copyInvestigationAttachments({
      attachmentsClient,
      escalation,
      investigation,
      logger,
    });

    expect(result.copied).toBe(1);
    const call = (attachmentsClient.bulkCreate as jest.Mock).mock.calls[0][0];
    expect(call.attachments).toHaveLength(1);
    expect(call.attachments[0].id).toBe('inv-1:txt');
  });

  it('returns { copied: 0, failed: 0 } without calling bulkCreate when the investigation has no eligible attachments', async () => {
    const { logger, attachmentsClient } = buildDeps();
    const investigation = makeConversation('inv-1', []);
    const escalation = makeConversation('esc-1');

    const result = await copyInvestigationAttachments({
      attachmentsClient,
      escalation,
      investigation,
      logger,
    });

    expect(result).toEqual({ copied: 0, failed: 0 });
    expect(attachmentsClient.bulkCreate).not.toHaveBeenCalled();
  });

  it('namespaces attachment ids with the investigation id', async () => {
    const { logger, attachmentsClient } = buildDeps();
    const investigation = makeConversation('inv-abc', [makeAttachment({ id: 'att-xyz' })]);
    const escalation = makeConversation('esc-1');

    (attachmentsClient.bulkCreate as jest.Mock).mockResolvedValue({ created: [], errors: [] });

    await copyInvestigationAttachments({
      attachmentsClient,
      escalation,
      investigation,
      logger,
    });

    const call = (attachmentsClient.bulkCreate as jest.Mock).mock.calls[0][0];
    expect(call.attachments[0].id).toBe('inv-abc:att-xyz');
  });

  it('logs errors at warn level and returns failed count', async () => {
    const { logger, attachmentsClient } = buildDeps();
    const att = makeAttachment({ id: 'att1' });
    const investigation = makeConversation('inv-1', [att]);
    const escalation = makeConversation('esc-1');

    (attachmentsClient.bulkCreate as jest.Mock).mockResolvedValue({
      created: [],
      errors: [{ id: 'inv-1:att1', type: 'text', message: 'something went wrong' }],
    });

    const result = await copyInvestigationAttachments({
      attachmentsClient,
      escalation,
      investigation,
      logger,
    });

    expect(result).toEqual({ copied: 0, failed: 1 });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to copy attachment to escalation')
    );
  });

  it('copies group_id when present', async () => {
    const { logger, attachmentsClient } = buildDeps();
    const att = makeAttachment({ id: 'att1', group_id: 'grp-1' });
    const investigation = makeConversation('inv-1', [att]);
    const escalation = makeConversation('esc-1');

    (attachmentsClient.bulkCreate as jest.Mock).mockResolvedValue({ created: [att], errors: [] });

    await copyInvestigationAttachments({ attachmentsClient, escalation, investigation, logger });

    const call = (attachmentsClient.bulkCreate as jest.Mock).mock.calls[0][0];
    expect(call.attachments[0].group_id).toBe('grp-1');
  });

  it('copies readonly when present', async () => {
    const { logger, attachmentsClient } = buildDeps();
    const att = makeAttachment({ id: 'att1', readonly: true });
    const investigation = makeConversation('inv-1', [att]);
    const escalation = makeConversation('esc-1');

    (attachmentsClient.bulkCreate as jest.Mock).mockResolvedValue({ created: [att], errors: [] });

    await copyInvestigationAttachments({ attachmentsClient, escalation, investigation, logger });

    const call = (attachmentsClient.bulkCreate as jest.Mock).mock.calls[0][0];
    expect(call.attachments[0].readonly).toBe(true);
  });

  it('omits group_id and readonly when not set on the source', async () => {
    const { logger, attachmentsClient } = buildDeps();
    const att = makeAttachment({ id: 'att1' });
    const investigation = makeConversation('inv-1', [att]);
    const escalation = makeConversation('esc-1');

    (attachmentsClient.bulkCreate as jest.Mock).mockResolvedValue({ created: [att], errors: [] });

    await copyInvestigationAttachments({ attachmentsClient, escalation, investigation, logger });

    const call = (attachmentsClient.bulkCreate as jest.Mock).mock.calls[0][0];
    expect(call.attachments[0]).not.toHaveProperty('group_id');
    expect(call.attachments[0]).not.toHaveProperty('readonly');
  });

  it('logs already-exists errors at debug level (idempotent retry)', async () => {
    const { logger, attachmentsClient } = buildDeps();
    const att = makeAttachment({ id: 'att1' });
    const investigation = makeConversation('inv-1', [att]);
    const escalation = makeConversation('esc-1');

    (attachmentsClient.bulkCreate as jest.Mock).mockResolvedValue({
      created: [],
      errors: [
        { id: 'inv-1:att1', type: 'text', message: "Attachment with id 'x' already exists" },
      ],
    });

    await copyInvestigationAttachments({
      attachmentsClient,
      escalation,
      investigation,
      logger,
    });

    expect(logger.debug).toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
