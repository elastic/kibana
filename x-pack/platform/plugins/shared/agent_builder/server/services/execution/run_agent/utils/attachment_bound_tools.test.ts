/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { ExecutableTool } from '@kbn/agent-builder-server';
import {
  resolveActiveAttachmentBoundTools,
  resolveAttachmentBoundTools,
} from './attachment_bound_tools';

const formatContext = { request: {} as any, spaceId: 'default' };

const createExecutableTool = (id: string, description = `tool-${id}`): ExecutableTool =>
  ({
    id,
    type: ToolType.builtin,
    description,
    tags: [],
    readonly: false,
    configuration: {},
    getSchema: () => z.object({ name: z.string() }),
    execute: jest.fn(),
  } as unknown as ExecutableTool);

const createAttachment = () =>
  ({
    id: 'a-1',
    type: 'text',
    active: true,
    current_version: 2,
    versions: [
      { version: 1, data: 'first', created_at: 'then', content_hash: 'h1' },
      { version: 2, data: 'second', created_at: 'now', content_hash: 'h2' },
    ],
  } as any);

/** A type whose bound tool describes the data of the version it was formatted from. */
const createAttachmentsService = () => {
  const format = jest.fn(async (attachment: { data: string }) => ({
    getBoundedTools: async () => [{ id: 'bound.tool', description: `for ${attachment.data}` }],
  }));
  const service = {
    getTypeDefinition: jest.fn().mockReturnValue({ format }),
    convertAttachmentTool: jest.fn((tool: { id: string; description: string }) =>
      createExecutableTool(tool.id, tool.description)
    ),
  };
  return { service: service as any, format };
};

describe('resolveAttachmentBoundTools', () => {
  it('returns the converted bound tools, formatted from the given version', async () => {
    const { service, format } = createAttachmentsService();

    const tools = await resolveAttachmentBoundTools({
      attachment: createAttachment(),
      version: 1,
      attachmentsService: service,
      formatContext,
    });

    expect(tools).toHaveLength(1);
    expect(tools[0]).toEqual(
      expect.objectContaining({ id: 'bound.tool', description: 'for first' })
    );
    expect(format).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a-1', data: 'first' }),
      formatContext
    );
  });

  it('returns no tools for an unknown version', async () => {
    const { service } = createAttachmentsService();

    expect(
      await resolveAttachmentBoundTools({
        attachment: createAttachment(),
        version: 3,
        attachmentsService: service,
        formatContext,
      })
    ).toEqual([]);
  });

  it('returns no tools for an unknown attachment type', async () => {
    const { service } = createAttachmentsService();
    service.getTypeDefinition.mockReturnValue(undefined);

    expect(
      await resolveAttachmentBoundTools({
        attachment: createAttachment(),
        version: 1,
        attachmentsService: service,
        formatContext,
      })
    ).toEqual([]);
  });

  it('returns no tools when the type binds none', async () => {
    const { service } = createAttachmentsService();
    service.getTypeDefinition.mockReturnValue({ format: jest.fn().mockResolvedValue({}) });

    expect(
      await resolveAttachmentBoundTools({
        attachment: createAttachment(),
        version: 1,
        attachmentsService: service,
        formatContext,
      })
    ).toEqual([]);
  });

  it('returns no tools when formatting throws', async () => {
    const { service } = createAttachmentsService();
    service.getTypeDefinition.mockReturnValue({
      format: jest.fn().mockRejectedValue(new Error('boom')),
    });

    expect(
      await resolveAttachmentBoundTools({
        attachment: createAttachment(),
        version: 1,
        attachmentsService: service,
        formatContext,
      })
    ).toEqual([]);
  });
});

describe('resolveActiveAttachmentBoundTools', () => {
  const resolve = (active: unknown[], service = createAttachmentsService().service) =>
    resolveActiveAttachmentBoundTools({
      attachmentStateManager: { getActive: jest.fn().mockReturnValue(active) } as any,
      attachmentsService: service,
      formatContext,
    });

  it('returns the tools of the active attachments, each at its current version', async () => {
    const other = { ...createAttachment(), id: 'a-2', current_version: 1 };

    const tools = await resolve([createAttachment(), other]);

    // a-1 is at version 2 ("second"), a-2 at version 1 ("first")
    expect(tools.map((tool) => tool.description)).toEqual(['for second', 'for first']);
  });

  it('returns no tools without active attachments', async () => {
    expect(await resolve([])).toEqual([]);
  });
});
