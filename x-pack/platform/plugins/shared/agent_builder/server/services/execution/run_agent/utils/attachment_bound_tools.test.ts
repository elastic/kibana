/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { AttachmentTimelineEvent } from '@kbn/agent-builder-common';
import { TimelineEventType, ToolOrigin, ToolType } from '@kbn/agent-builder-common';
import type { ExecutableTool } from '@kbn/agent-builder-server';
import { ToolManagerToolType } from '@kbn/agent-builder-server/runner';
import { AttachmentBoundTools, resolveAttachmentBoundTools } from './attachment_bound_tools';

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

const createToolManager = () => ({
  addTools: jest.fn().mockResolvedValue(undefined),
  removeDynamicTools: jest.fn(),
});

describe('AttachmentBoundTools', () => {
  /** `records` is what the state manager knows, `active` the subset it reports active. */
  const setup = ({
    records = [createAttachment()],
    active = records,
    service = createAttachmentsService().service,
    logger,
  }: {
    records?: any[];
    active?: any[];
    service?: any;
    logger?: { warn: jest.Mock };
  } = {}) => {
    const attachmentStateManager = {
      getAttachmentRecord: jest.fn((id: string) => records.find((record) => record.id === id)),
      getActive: jest.fn(() => active),
    };
    const boundTools = new AttachmentBoundTools({
      attachmentStateManager: attachmentStateManager as any,
      attachmentsService: service,
      formatContext,
      logger: logger as any,
    });
    return { boundTools, attachmentStateManager, toolManager: createToolManager() };
  };

  describe('definitions', () => {
    it('renders the definitions of an added event', async () => {
      const { boundTools } = setup();
      const event = addedEvent(1);

      await boundTools.prepare([event]);

      expect(boundTools.get(event)).toEqual([
        {
          tool_id: 'bound.tool',
          description: 'for first',
          parameters: expect.objectContaining({ type: 'object' }),
        },
      ]);
    });

    it('renders restored and updated events too', async () => {
      const { boundTools } = setup();
      const restored = createEvent(TimelineEventType.attachmentRestored, { current_version: 2 });
      const updated = createEvent(TimelineEventType.attachmentUpdated, {
        previous_version: 1,
        current_version: 2,
        render_inline: true,
      });

      await boundTools.prepare([restored, updated]);

      expect(boundTools.get(restored)?.[0].description).toBe('for second');
      expect(boundTools.get(updated)?.[0].description).toBe('for second');
    });

    it('renders each event from the version it announces, not the latest', async () => {
      const { boundTools } = setup();
      const first = addedEvent(1);
      const second = createEvent(TimelineEventType.attachmentUpdated, {
        previous_version: 1,
        current_version: 2,
        render_inline: true,
      });

      await boundTools.prepare([first, second]);

      expect(boundTools.get(first)?.[0].description).toBe('for first');
      expect(boundTools.get(second)?.[0].description).toBe('for second');
    });

    it('carries no definitions on a deleted event', async () => {
      const { service, format } = createAttachmentsService();
      const { boundTools } = setup({ service });
      const deleted = createEvent(TimelineEventType.attachmentDeleted, { hard_delete: false });

      await boundTools.prepare([deleted]);

      expect(boundTools.get(deleted)).toBeUndefined();
      expect(format).not.toHaveBeenCalled();
    });

    it('carries no definitions when the attachment record is gone', async () => {
      const { boundTools } = setup({ records: [] });
      const event = addedEvent(1);

      await boundTools.prepare([event]);

      expect(boundTools.get(event)).toBeUndefined();
    });

    it('carries no definitions when the attachment binds no tools', async () => {
      const { service, format } = createAttachmentsService();
      format.mockResolvedValue({ getBoundedTools: async () => [] });
      const { boundTools } = setup({ service });
      const event = addedEvent(1);

      await boundTools.prepare([event]);

      expect(boundTools.get(event)).toBeUndefined();
    });

    it('carries no definitions for an event that was not prepared', () => {
      const { boundTools } = setup();

      expect(boundTools.get(addedEvent(1))).toBeUndefined();
    });

    it('formats an attachment version once, however often it is prepared', async () => {
      const { service, format } = createAttachmentsService();
      const { boundTools } = setup({ service });
      const event = addedEvent(1);
      const restored = createEvent(TimelineEventType.attachmentRestored, { current_version: 1 });

      await boundTools.prepare([event, restored]);
      await boundTools.prepare([event]);

      expect(format).toHaveBeenCalledTimes(1);
      expect(boundTools.get(restored)).toEqual(boundTools.get(event));
    });

    it('leaves out a tool whose definition cannot be rendered, keeping the others', async () => {
      const { service } = createAttachmentsService();
      const broken = createExecutableTool('broken.tool');
      broken.getSchema = () => {
        throw new Error('no schema');
      };
      service.getTypeDefinition.mockReturnValue({
        format: async () => ({
          getBoundedTools: async () => [{ id: 'broken.tool' }, { id: 'bound.tool' }],
        }),
      });
      service.convertAttachmentTool.mockImplementation((tool: { id: string }) =>
        tool.id === 'broken.tool' ? broken : createExecutableTool(tool.id)
      );
      const logger = { warn: jest.fn() };
      const { boundTools } = setup({ service, logger });
      const event = addedEvent(1);

      await boundTools.prepare([event]);

      expect(boundTools.get(event)?.map((definition) => definition.tool_id)).toEqual([
        'bound.tool',
      ]);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('broken.tool'));
    });

    it('carries no definitions when no bound tool can be rendered', async () => {
      const { service } = createAttachmentsService();
      service.convertAttachmentTool.mockImplementation((tool: { id: string }) => ({
        ...createExecutableTool(tool.id),
        getSchema: () => {
          throw new Error('no schema');
        },
      }));
      const { boundTools } = setup({ service });
      const event = addedEvent(1);

      await boundTools.prepare([event]);

      expect(boundTools.get(event)).toBeUndefined();
    });
  });

  describe('sync', () => {
    const registeredIds = (toolManager: ReturnType<typeof createToolManager>) =>
      toolManager.addTools.mock.calls.at(-1)?.[0].tools.map((tool: { id: string }) => tool.id);

    it('registers the tools of the active attachments, each at its current version, as inline dynamic tools', async () => {
      const other = { ...createAttachment(), id: 'a-2', current_version: 1 };
      const { boundTools, toolManager } = setup({ records: [createAttachment(), other] });

      await boundTools.sync(toolManager as any);

      expect(toolManager.removeDynamicTools).toHaveBeenCalledWith([]);
      expect(toolManager.addTools).toHaveBeenCalledWith({
        type: ToolManagerToolType.dynamic,
        tools: [
          // a-1 is at version 2 ("second"), a-2 at version 1 ("first")
          expect.objectContaining({ description: 'for second', origin: ToolOrigin.inline }),
          expect.objectContaining({ description: 'for first', origin: ToolOrigin.inline }),
        ],
      });
    });

    it('registers nothing without active attachments', async () => {
      const { boundTools, toolManager } = setup({ active: [] });

      await boundTools.sync(toolManager as any);

      expect(registeredIds(toolManager)).toEqual([]);
    });

    it('removes the tools it registered before that are no longer bound', async () => {
      const attachment = createAttachment();
      const { boundTools, toolManager, attachmentStateManager } = setup({
        records: [attachment],
      });
      await boundTools.sync(toolManager as any);
      // the attachment was deleted
      attachmentStateManager.getActive.mockReturnValue([]);

      await boundTools.sync(toolManager as any);

      expect(toolManager.removeDynamicTools).toHaveBeenLastCalledWith(['bound.tool']);
      expect(registeredIds(toolManager)).toEqual([]);
    });

    it('does not remove a tool again once it is gone', async () => {
      const { boundTools, toolManager, attachmentStateManager } = setup();
      await boundTools.sync(toolManager as any);
      attachmentStateManager.getActive.mockReturnValue([]);
      await boundTools.sync(toolManager as any);

      await boundTools.sync(toolManager as any);

      expect(toolManager.removeDynamicTools).toHaveBeenLastCalledWith([]);
    });

    it('reuses the tools resolved for the definitions, formatting each version once', async () => {
      const { service, format } = createAttachmentsService();
      const { boundTools, toolManager } = setup({ service });

      await boundTools.prepare([addedEvent(2)]);
      await boundTools.sync(toolManager as any);
      await boundTools.sync(toolManager as any);

      expect(format).toHaveBeenCalledTimes(1);
      expect(registeredIds(toolManager)).toEqual(['bound.tool']);
    });
  });
});
