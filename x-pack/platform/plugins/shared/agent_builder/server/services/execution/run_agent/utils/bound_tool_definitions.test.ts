/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { AttachmentTimelineEvent } from '@kbn/agent-builder-common';
import { TimelineEventType, ToolType } from '@kbn/agent-builder-common';
import type { ExecutableTool } from '@kbn/agent-builder-server';
import { BoundToolDefinitions } from './bound_tool_definitions';

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

const createEvent = (
  type: TimelineEventType,
  data: Record<string, unknown>
): AttachmentTimelineEvent =>
  ({
    id: `${type}-${JSON.stringify(data)}`,
    type,
    created_at: '2026-01-01T00:00:00.000Z',
    actor: { type: 'agent', id: 'agent' },
    data: { attachment_id: 'a-1', attachment_type: 'text', source: 'execution', ...data },
  } as unknown as AttachmentTimelineEvent);

const addedEvent = (version = 1) =>
  createEvent(TimelineEventType.attachmentAdded, { current_version: version, render_inline: true });

describe('BoundToolDefinitions', () => {
  const createDefinitions = (record: unknown = createAttachment()) => {
    const { service, format } = createAttachmentsService();
    const attachmentStateManager = { getAttachmentRecord: jest.fn().mockReturnValue(record) };
    const definitions = new BoundToolDefinitions({
      attachmentStateManager: attachmentStateManager as any,
      attachmentsService: service,
      formatContext,
    });
    return { definitions, format, attachmentStateManager };
  };

  it('renders the definitions of an added event', async () => {
    const { definitions } = createDefinitions();
    const event = addedEvent(1);

    await definitions.prepare([event]);

    expect(definitions.get(event)).toEqual([
      {
        tool_id: 'bound.tool',
        description: 'for first',
        parameters: expect.objectContaining({ type: 'object' }),
      },
    ]);
  });

  it('renders restored and updated events too', async () => {
    const { definitions } = createDefinitions();
    const restored = createEvent(TimelineEventType.attachmentRestored, { current_version: 2 });
    const updated = createEvent(TimelineEventType.attachmentUpdated, {
      previous_version: 1,
      current_version: 2,
      render_inline: true,
    });

    await definitions.prepare([restored, updated]);

    expect(definitions.get(restored)?.[0].description).toBe('for second');
    expect(definitions.get(updated)?.[0].description).toBe('for second');
  });

  it('renders each event from the version it announces, not the latest', async () => {
    const { definitions } = createDefinitions();
    const first = addedEvent(1);
    const second = createEvent(TimelineEventType.attachmentUpdated, {
      previous_version: 1,
      current_version: 2,
      render_inline: true,
    });

    await definitions.prepare([first, second]);

    expect(definitions.get(first)?.[0].description).toBe('for first');
    expect(definitions.get(second)?.[0].description).toBe('for second');
  });

  it('carries no definitions on a deleted event', async () => {
    const { definitions, format } = createDefinitions();
    const deleted = createEvent(TimelineEventType.attachmentDeleted, { hard_delete: false });

    await definitions.prepare([deleted]);

    expect(definitions.get(deleted)).toBeUndefined();
    expect(format).not.toHaveBeenCalled();
  });

  it('carries no definitions when the attachment record is gone', async () => {
    // null, since undefined would pick the default record
    const { definitions } = createDefinitions(null);
    const event = addedEvent(1);

    await definitions.prepare([event]);

    expect(definitions.get(event)).toBeUndefined();
  });

  it('carries no definitions when the attachment binds no tools', async () => {
    const { definitions, format } = createDefinitions();
    format.mockResolvedValue({ getBoundedTools: async () => [] });
    const event = addedEvent(1);

    await definitions.prepare([event]);

    expect(definitions.get(event)).toBeUndefined();
  });

  it('carries no definitions for an event that was not prepared', () => {
    const { definitions } = createDefinitions();

    expect(definitions.get(addedEvent(1))).toBeUndefined();
  });

  it('formats an attachment version once, however often it is prepared', async () => {
    const { definitions, format } = createDefinitions();
    const event = addedEvent(1);
    const restored = createEvent(TimelineEventType.attachmentRestored, { current_version: 1 });

    await definitions.prepare([event, restored]);
    await definitions.prepare([event]);

    expect(format).toHaveBeenCalledTimes(1);
    expect(definitions.get(restored)).toEqual(definitions.get(event));
  });
});
