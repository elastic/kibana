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
import { createToolProviderMock } from '../../../../test_utils';
import { AttachmentDynamicTools, resolveAttachmentBoundTools } from './attachment_dynamic_tools';

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
  syncDynamicTools: jest.fn(),
});

describe('AttachmentDynamicTools', () => {
  /** `records` is what the state manager knows, `active` the subset it reports active. */
  const setup = ({
    records = [createAttachment()],
    active = records,
    service = createAttachmentsService().service,
    toolProvider = createToolProviderMock(),
    isNativeTool = () => false,
    logger,
  }: {
    records?: any[];
    active?: any[];
    service?: any;
    toolProvider?: ReturnType<typeof createToolProviderMock>;
    isNativeTool?: (toolId: string) => boolean;
    logger?: { warn: jest.Mock };
  } = {}) => {
    const attachmentStateManager = {
      getAttachmentRecord: jest.fn((id: string) => records.find((record) => record.id === id)),
      getActive: jest.fn(() => active),
    };
    const dynamicTools = new AttachmentDynamicTools({
      attachmentStateManager: attachmentStateManager as any,
      attachmentsService: service,
      formatContext,
      toolProvider,
      isNativeTool,
      logger: logger as any,
    });
    return { dynamicTools, attachmentStateManager, toolManager: createToolManager() };
  };

  describe('definitions', () => {
    it('renders the definitions of an added event', async () => {
      const { dynamicTools } = setup();
      const event = addedEvent(1);

      await dynamicTools.prepare([event]);

      expect(dynamicTools.get(event)).toEqual([
        {
          tool_id: 'bound.tool',
          description: 'for first',
          parameters: expect.objectContaining({ type: 'object' }),
        },
      ]);
    });

    it('renders restored and updated events too', async () => {
      const { dynamicTools } = setup();
      const restored = createEvent(TimelineEventType.attachmentRestored, { current_version: 2 });
      const updated = createEvent(TimelineEventType.attachmentUpdated, {
        previous_version: 1,
        current_version: 2,
        render_inline: true,
      });

      await dynamicTools.prepare([restored, updated]);

      expect(dynamicTools.get(restored)?.[0].description).toBe('for second');
      expect(dynamicTools.get(updated)?.[0].description).toBe('for second');
    });

    it('renders each event from the version it announces, not the latest', async () => {
      const { dynamicTools } = setup();
      const first = addedEvent(1);
      const second = createEvent(TimelineEventType.attachmentUpdated, {
        previous_version: 1,
        current_version: 2,
        render_inline: true,
      });

      await dynamicTools.prepare([first, second]);

      expect(dynamicTools.get(first)?.[0].description).toBe('for first');
      expect(dynamicTools.get(second)?.[0].description).toBe('for second');
    });

    it('carries no definitions on a deleted event', async () => {
      const { service, format } = createAttachmentsService();
      const { dynamicTools } = setup({ service });
      const deleted = createEvent(TimelineEventType.attachmentDeleted, { hard_delete: false });

      await dynamicTools.prepare([deleted]);

      expect(dynamicTools.get(deleted)).toBeUndefined();
      expect(format).not.toHaveBeenCalled();
    });

    it('carries no definitions when the attachment record is gone', async () => {
      const { dynamicTools } = setup({ records: [] });
      const event = addedEvent(1);

      await dynamicTools.prepare([event]);

      expect(dynamicTools.get(event)).toBeUndefined();
    });

    it('carries no definitions when the attachment binds no tools', async () => {
      const { service, format } = createAttachmentsService();
      format.mockResolvedValue({ getBoundedTools: async () => [] });
      const { dynamicTools } = setup({ service });
      const event = addedEvent(1);

      await dynamicTools.prepare([event]);

      expect(dynamicTools.get(event)).toBeUndefined();
    });

    it('carries no definitions for an event that was not prepared', () => {
      const { dynamicTools } = setup();

      expect(dynamicTools.get(addedEvent(1))).toBeUndefined();
    });

    it('formats an attachment version once, however often it is prepared', async () => {
      const { service, format } = createAttachmentsService();
      const { dynamicTools } = setup({ service });
      const event = addedEvent(1);
      const restored = createEvent(TimelineEventType.attachmentRestored, { current_version: 1 });

      await dynamicTools.prepare([event, restored]);
      await dynamicTools.prepare([event]);

      expect(format).toHaveBeenCalledTimes(1);
      expect(dynamicTools.get(restored)).toEqual(dynamicTools.get(event));
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
      const { dynamicTools } = setup({ service, logger });
      const event = addedEvent(1);

      await dynamicTools.prepare([event]);

      expect(dynamicTools.get(event)?.map((definition) => definition.tool_id)).toEqual([
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
      const { dynamicTools } = setup({ service });
      const event = addedEvent(1);

      await dynamicTools.prepare([event]);

      expect(dynamicTools.get(event)).toBeUndefined();
    });
  });

  describe('sync', () => {
    const registeredIds = (toolManager: ReturnType<typeof createToolManager>) =>
      toolManager.syncDynamicTools.mock.calls
        .at(-1)?.[0]
        .tools.map((tool: { id: string }) => tool.id);

    it('syncs the tools of the active attachments, each at its current version, as inline dynamic tools', async () => {
      const other = { ...createAttachment(), id: 'a-2', current_version: 1 };
      const { dynamicTools, toolManager } = setup({ records: [createAttachment(), other] });

      await dynamicTools.sync(toolManager as any);

      expect(toolManager.syncDynamicTools).toHaveBeenCalledWith({
        source: 'attachments',
        tools: [
          // a-1 is at version 2 ("second"), a-2 at version 1 ("first")
          expect.objectContaining({ description: 'for second', origin: ToolOrigin.inline }),
          expect.objectContaining({ description: 'for first', origin: ToolOrigin.inline }),
        ],
      });
    });

    it('passes its logger, for the tool manager to warn about id clashes', async () => {
      const logger = { warn: jest.fn() };
      const { dynamicTools, toolManager } = setup({ logger });

      await dynamicTools.sync(toolManager as any);

      expect(toolManager.syncDynamicTools).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'attachments', logger })
      );
    });

    it('syncs no tools without active attachments', async () => {
      const { dynamicTools, toolManager } = setup({ active: [] });

      await dynamicTools.sync(toolManager as any);

      expect(registeredIds(toolManager)).toEqual([]);
    });

    it('syncs only the tools bound now, so the tool manager removes the ones no longer bound', async () => {
      const attachment = createAttachment();
      const { dynamicTools, toolManager, attachmentStateManager } = setup({
        records: [attachment],
      });
      await dynamicTools.sync(toolManager as any);
      // the attachment was deleted
      attachmentStateManager.getActive.mockReturnValue([]);

      await dynamicTools.sync(toolManager as any);

      expect(registeredIds(toolManager)).toEqual([]);
    });

    it('reuses the tools resolved for the definitions, formatting each version once', async () => {
      const { service, format } = createAttachmentsService();
      const { dynamicTools, toolManager } = setup({ service });

      await dynamicTools.prepare([addedEvent(2)]);
      await dynamicTools.sync(toolManager as any);
      await dynamicTools.sync(toolManager as any);

      expect(format).toHaveBeenCalledTimes(1);
      expect(registeredIds(toolManager)).toEqual(['bound.tool']);
    });
  });

  describe('unannouncedDefinitions', () => {
    it('renders the definitions of the active attachments no event announces', async () => {
      const { dynamicTools } = setup();

      const definitions = await dynamicTools.unannouncedDefinitions([]);

      // a-1 is at version 2
      expect(definitions).toEqual([
        expect.objectContaining({ tool_id: 'bound.tool', description: 'for second' }),
      ]);
    });

    it('leaves out an attachment an event announces at its current version', async () => {
      const { dynamicTools } = setup();
      const updated = createEvent(TimelineEventType.attachmentUpdated, {
        previous_version: 1,
        current_version: 2,
        render_inline: true,
      });

      expect(await dynamicTools.unannouncedDefinitions([updated])).toEqual([]);
    });

    it('keeps an attachment only announced at an older version', async () => {
      const { dynamicTools } = setup();

      const definitions = await dynamicTools.unannouncedDefinitions([addedEvent(1)]);

      expect(definitions.map((definition) => definition.description)).toEqual(['for second']);
    });

    it('leaves out an attachment that binds no tools', async () => {
      const { service, format } = createAttachmentsService();
      format.mockResolvedValue({ getBoundedTools: async () => [] });
      const { dynamicTools } = setup({ service });

      expect(await dynamicTools.unannouncedDefinitions([])).toEqual([]);
    });

    it('reuses the definitions prepare rendered', async () => {
      const { service, format } = createAttachmentsService();
      const { dynamicTools } = setup({ service });
      await dynamicTools.prepare([addedEvent(2)]);

      await dynamicTools.unannouncedDefinitions([]);

      expect(format).toHaveBeenCalledTimes(1);
    });

    it('counts the versions prepare saw during the run as announced', async () => {
      const { dynamicTools } = setup();
      // the run updates the attachment to version 2 and prepares the event
      await dynamicTools.prepare([
        createEvent(TimelineEventType.attachmentUpdated, {
          previous_version: 1,
          current_version: 2,
          render_inline: true,
        }),
      ]);

      expect(await dynamicTools.unannouncedDefinitions([addedEvent(1)])).toEqual([]);
    });

    it('reflects the attachments active when resolved, not when constructed', async () => {
      const active = [createAttachment()];
      const { dynamicTools } = setup({ active });
      const resolve = () => dynamicTools.unannouncedDefinitions([]);
      expect(await resolve()).toHaveLength(1);

      // the run deletes the attachment
      active.splice(0, 1);

      expect(await resolve()).toEqual([]);
    });
  });

  describe('type tools (getTools)', () => {
    const createSecondAttachment = (type = 'text') => ({
      ...createAttachment(),
      id: 'a-2',
      type,
      current_version: 1,
    });

    const secondAddedEvent = (type = 'text') =>
      createEvent(TimelineEventType.attachmentAdded, {
        attachment_id: 'a-2',
        attachment_type: type,
        current_version: 1,
        render_inline: true,
      });

    /**
     * Types that declare registry tools (`typeTools`, by type) next to the tool every attachment
     * binds (`bound.tool`); `registryToolIds` are the tools the registry has, `nativeToolIds` the
     * ones the agent has in its native tool list.
     */
    const setupTypeTools = ({
      typeTools = { text: ['text.type_tool'] },
      registryToolIds = ['text.type_tool'],
      nativeToolIds = [],
      records = [createAttachment()],
    }: {
      typeTools?: Record<string, string[]>;
      registryToolIds?: string[];
      nativeToolIds?: string[];
      records?: any[];
    } = {}) => {
      const { service, format } = createAttachmentsService();
      service.getTypeDefinition.mockImplementation((type: string) => ({
        format,
        getTools: () => typeTools[type] ?? [],
      }));
      const toolProvider = createToolProviderMock();
      toolProvider.list.mockResolvedValue(registryToolIds.map((id) => createExecutableTool(id)));
      const isNativeTool = (toolId: string) => nativeToolIds.includes(toolId);
      return { ...setup({ records, service, toolProvider, isNativeTool }), toolProvider, format };
    };

    const definitionIds = (definitions: Array<{ tool_id: string }> | undefined) =>
      definitions?.map((definition) => definition.tool_id);

    const lastRegistered = (toolManager: ReturnType<typeof createToolManager>) =>
      toolManager.syncDynamicTools.mock.calls.at(-1)?.[0].tools;

    describe('definitions', () => {
      it('describes the tools of a type on the first event of the type, after its bound tools', async () => {
        const { dynamicTools } = setupTypeTools({
          records: [createAttachment(), createSecondAttachment()],
        });
        const first = addedEvent(1);
        const second = secondAddedEvent();

        await dynamicTools.prepare([first, second]);

        expect(dynamicTools.get(first)).toEqual([
          expect.objectContaining({ tool_id: 'bound.tool' }),
          {
            tool_id: 'text.type_tool',
            description: 'tool-text.type_tool',
            parameters: expect.objectContaining({ type: 'object' }),
          },
        ]);
        expect(definitionIds(dynamicTools.get(second))).toEqual(['bound.tool']);
      });

      it('keeps a type tool on the event that described it first on later prepares', async () => {
        const { dynamicTools } = setupTypeTools({
          records: [createAttachment(), createSecondAttachment()],
        });
        const first = addedEvent(1);
        const second = secondAddedEvent();
        await dynamicTools.prepare([first]);

        await dynamicTools.prepare([second, first]);

        expect(definitionIds(dynamicTools.get(first))).toEqual(['bound.tool', 'text.type_tool']);
        expect(definitionIds(dynamicTools.get(second))).toEqual(['bound.tool']);
      });

      it('describes a tool two types declare once, on the first event of either type', async () => {
        const { dynamicTools } = setupTypeTools({
          typeTools: { text: ['shared.tool'], other: ['shared.tool', 'other.tool'] },
          registryToolIds: ['shared.tool', 'other.tool'],
          records: [createAttachment(), createSecondAttachment('other')],
        });
        const first = addedEvent(1);
        const second = secondAddedEvent('other');

        await dynamicTools.prepare([first, second]);

        expect(definitionIds(dynamicTools.get(first))).toEqual(['bound.tool', 'shared.tool']);
        expect(definitionIds(dynamicTools.get(second))).toEqual(['bound.tool', 'other.tool']);
      });

      it('leaves out a declared tool the registry does not have', async () => {
        const { dynamicTools } = setupTypeTools({ registryToolIds: [] });
        const event = addedEvent(1);

        await dynamicTools.prepare([event]);

        expect(definitionIds(dynamicTools.get(event))).toEqual(['bound.tool']);
      });

      it('resolves the tools of a type once, however many attachments and calls', async () => {
        const { dynamicTools, toolManager, toolProvider } = setupTypeTools({
          records: [createAttachment(), createSecondAttachment()],
        });

        await dynamicTools.prepare([addedEvent(1), secondAddedEvent()]);
        await dynamicTools.sync(toolManager as any);
        await dynamicTools.sync(toolManager as any);
        await dynamicTools.unannouncedDefinitions([]);

        expect(toolProvider.list).toHaveBeenCalledTimes(1);
        expect(toolProvider.list).toHaveBeenCalledWith({ request: formatContext.request });
      });

      it('lists the registry once however many types declare tools', async () => {
        const { dynamicTools, toolProvider } = setupTypeTools({
          typeTools: { text: ['text.type_tool'], other: ['other.type_tool'] },
          registryToolIds: ['text.type_tool', 'other.type_tool'],
          records: [createAttachment(), createSecondAttachment('other')],
        });
        const [textEvent, otherEvent] = [addedEvent(1), secondAddedEvent('other')];

        await dynamicTools.prepare([textEvent, otherEvent]);

        expect(toolProvider.list).toHaveBeenCalledTimes(1);
        expect(definitionIds(dynamicTools.get(textEvent))).toEqual([
          'bound.tool',
          'text.type_tool',
        ]);
        expect(definitionIds(dynamicTools.get(otherEvent))).toEqual([
          'bound.tool',
          'other.type_tool',
        ]);
      });

      it('does not ask the registry for a type that declares no tools', async () => {
        const { dynamicTools, toolManager, toolProvider } = setupTypeTools({ typeTools: {} });

        await dynamicTools.prepare([addedEvent(1)]);
        await dynamicTools.sync(toolManager as any);

        expect(toolProvider.list).not.toHaveBeenCalled();
      });
    });

    describe('sync', () => {
      it('syncs the tools of the active types once per type, as registry dynamic tools', async () => {
        const { dynamicTools, toolManager } = setupTypeTools({
          records: [createAttachment(), createSecondAttachment()],
        });

        await dynamicTools.sync(toolManager as any);

        expect(toolManager.syncDynamicTools).toHaveBeenCalledWith({
          source: 'attachments',
          tools: [
            expect.objectContaining({ id: 'text.type_tool', origin: ToolOrigin.registry }),
            expect.objectContaining({ id: 'bound.tool', origin: ToolOrigin.inline }),
            expect.objectContaining({ id: 'bound.tool', origin: ToolOrigin.inline }),
          ],
        });
      });

      it('syncs a tool several types declare once', async () => {
        const { dynamicTools, toolManager } = setupTypeTools({
          typeTools: { text: ['shared.tool'], other: ['shared.tool', 'other.tool'] },
          registryToolIds: ['shared.tool', 'other.tool'],
          records: [createAttachment(), createSecondAttachment('other')],
        });

        await dynamicTools.sync(toolManager as any);

        expect(
          lastRegistered(toolManager)
            .filter(
              (tool: ExecutableTool & { origin: ToolOrigin }) => tool.origin === ToolOrigin.registry
            )
            .map((tool: ExecutableTool) => tool.id)
        ).toEqual(['shared.tool', 'other.tool']);
      });

      it('keeps the tools of a type while one of its attachments is active', async () => {
        const second = createSecondAttachment();
        const { dynamicTools, toolManager, attachmentStateManager } = setupTypeTools({
          records: [createAttachment(), second],
        });
        await dynamicTools.sync(toolManager as any);
        // the first attachment was deleted
        attachmentStateManager.getActive.mockReturnValue([second]);

        await dynamicTools.sync(toolManager as any);

        expect(lastRegistered(toolManager)).toEqual([
          expect.objectContaining({ id: 'text.type_tool' }),
          expect.objectContaining({ id: 'bound.tool' }),
        ]);
      });

      it('no longer syncs the tools of a type when its last attachment goes', async () => {
        const first = createAttachment();
        const { dynamicTools, toolManager, attachmentStateManager } = setupTypeTools({
          typeTools: { text: ['text.type_tool'], other: ['other.type_tool'] },
          registryToolIds: ['text.type_tool', 'other.type_tool'],
          records: [first, createSecondAttachment('other')],
        });
        await dynamicTools.sync(toolManager as any);
        // the only attachment of type `other` was deleted
        attachmentStateManager.getActive.mockReturnValue([first]);

        await dynamicTools.sync(toolManager as any);

        expect(lastRegistered(toolManager)).toEqual([
          expect.objectContaining({ id: 'text.type_tool' }),
          expect.objectContaining({ id: 'bound.tool' }),
        ]);
      });
    });

    describe('unannouncedDefinitions', () => {
      it('includes the tools of the active types no prepared event describes', async () => {
        const { dynamicTools } = setupTypeTools();

        const definitions = await dynamicTools.unannouncedDefinitions([]);

        expect(definitionIds(definitions)).toEqual(['bound.tool', 'text.type_tool']);
      });

      it('includes a type tool once however many active attachments declare it', async () => {
        const { dynamicTools } = setupTypeTools({
          records: [createAttachment(), createSecondAttachment()],
        });

        const definitions = await dynamicTools.unannouncedDefinitions([]);

        expect(definitionIds(definitions)).toEqual(['bound.tool', 'bound.tool', 'text.type_tool']);
      });

      it('leaves out the type tools a prepared event describes', async () => {
        const { dynamicTools } = setupTypeTools();
        await dynamicTools.prepare([addedEvent(2)]);

        expect(await dynamicTools.unannouncedDefinitions([])).toEqual([]);
      });

      it('does not take over describing a type tool: a later event still does', async () => {
        const { dynamicTools } = setupTypeTools();
        const event = addedEvent(2);
        await dynamicTools.unannouncedDefinitions([]);

        await dynamicTools.prepare([event]);

        expect(definitionIds(dynamicTools.get(event))).toEqual(['bound.tool', 'text.type_tool']);
      });
    });

    describe('tools the agent has in its native tool list', () => {
      /** The `text` type declares a tool the agent has natively and one it does not. */
      const setupNativeTool = () =>
        setupTypeTools({
          typeTools: { text: ['native.tool', 'text.type_tool'] },
          registryToolIds: ['native.tool', 'text.type_tool'],
          nativeToolIds: ['native.tool'],
        });

      it('leaves a native tool out of the definitions of the event', async () => {
        const { dynamicTools } = setupNativeTool();
        const event = addedEvent(1);

        await dynamicTools.prepare([event]);

        expect(definitionIds(dynamicTools.get(event))).toEqual(['bound.tool', 'text.type_tool']);
      });

      it('carries no definitions when every tool of the type is native', async () => {
        const { dynamicTools, format } = setupTypeTools({ nativeToolIds: ['text.type_tool'] });
        format.mockResolvedValue({ getBoundedTools: async () => [] });
        const event = addedEvent(1);

        await dynamicTools.prepare([event]);

        expect(dynamicTools.get(event)).toBeUndefined();
      });

      it('tells native tools apart when the definitions are read, not when they are prepared', async () => {
        // the events are prepared before the run adds its native tools
        const nativeToolIds: string[] = [];
        const { dynamicTools } = setupTypeTools({ nativeToolIds });
        const event = addedEvent(1);
        await dynamicTools.prepare([event]);

        nativeToolIds.push('text.type_tool');

        expect(definitionIds(dynamicTools.get(event))).toEqual(['bound.tool']);
      });

      it('does not register a native tool as a dynamic tool', async () => {
        const { dynamicTools, toolManager } = setupNativeTool();

        await dynamicTools.sync(toolManager as any);

        expect(lastRegistered(toolManager)).toEqual([
          expect.objectContaining({ id: 'text.type_tool' }),
          expect.objectContaining({ id: 'bound.tool' }),
        ]);
      });

      it('leaves a native tool out of the definitions no event describes', async () => {
        const { dynamicTools } = setupNativeTool();

        const definitions = await dynamicTools.unannouncedDefinitions([]);

        expect(definitionIds(definitions)).toEqual(['bound.tool', 'text.type_tool']);
      });

      it('leaves a bound tool under a native id out of the definitions of the event', async () => {
        const { dynamicTools } = setupTypeTools({ nativeToolIds: ['bound.tool'] });
        const event = addedEvent(1);

        await dynamicTools.prepare([event]);

        expect(definitionIds(dynamicTools.get(event))).toEqual(['text.type_tool']);
      });

      it('leaves a bound tool under a native id out of the definitions no event describes', async () => {
        const { dynamicTools } = setupTypeTools({ nativeToolIds: ['bound.tool'] });

        const definitions = await dynamicTools.unannouncedDefinitions([]);

        expect(definitionIds(definitions)).toEqual(['text.type_tool']);
      });
    });
  });
});
