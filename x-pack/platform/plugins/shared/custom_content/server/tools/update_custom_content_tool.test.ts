/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ToolResultType,
  isErrorResult,
  type ToolResult,
} from '@kbn/agent-builder-common/tools/tool_result';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE } from '../../common/panel_context_attachment';
import { createUpdateCustomContentTool } from './update_custom_content_tool';

const mockResolver = jest.fn();
jest.mock('@kbn/custom-content-server', () => ({
  createCustomContentTemplateResolver: jest.fn(() => mockResolver),
}));

const makeAttachment = (data: Record<string, unknown>) => ({
  id: 'att-1',
  type: CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  current_version: 1,
  versions: [{ version: 1, data }],
});

const makeContext = (attachmentData?: Record<string, unknown>) => {
  const attachment = attachmentData ? makeAttachment(attachmentData) : undefined;
  // `attachments.update` resolves the new versioned attachment; the tool reads `current_version`
  // off it so the agent can address that exact version in its render tag.
  const update = jest.fn().mockResolvedValue({ ...attachment, current_version: 2 });
  return {
    attachments: {
      getAll: jest.fn().mockReturnValue(attachment ? [attachment] : []),
      update,
    },
    logger: { warn: jest.fn(), error: jest.fn() },
    esClient: {},
    modelProvider: {},
    update,
    attachment,
  };
};

const callHandler = async (
  params: { embeddable_id?: string; prompt?: string; esqlQuery?: string | null },
  attachmentData?: Record<string, unknown>
) => {
  const tool = createUpdateCustomContentTool();
  type HandlerParams = Parameters<typeof tool.handler>[0];
  type HandlerCtx = Parameters<typeof tool.handler>[1];
  const ctx = makeContext(attachmentData);
  const ret = await tool.handler(params as HandlerParams, ctx as unknown as HandlerCtx);
  if (!('results' in ret)) throw new Error('Unexpected HITL return from tool handler');
  return { results: ret.results, ctx };
};

describe('createUpdateCustomContentTool handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolver.mockResolvedValue('<div>generated</div>');
  });

  describe('missing attachment', () => {
    it('returns an error when no context attachment exists', async () => {
      const { results, ctx } = await callHandler({ embeddable_id: 'p1', prompt: 'Show KPIs' });
      expect(results[0].type).toBe(ToolResultType.error);
      expect(ctx.update).not.toHaveBeenCalled();
    });

    // A miss is routine — most panels on a dashboard were never sent to chat — so the error has to
    // name the route that does work, or the agent dead-ends and invents its own advice.
    it('points at the dashboard tool rather than dead-ending', async () => {
      const { results } = await callHandler({ embeddable_id: 'p1', prompt: 'Show KPIs' });
      const result = results[0] as ToolResult;
      if (!isErrorResult(result)) throw new Error('Expected error result');
      expect(result.data.message).toContain('platform.dashboard.generate_dashboard');
    });

    it('lists the attached panels so a wrong id is recoverable', async () => {
      const { results } = await callHandler(
        { embeddable_id: 'wrong-id', prompt: 'Show KPIs' },
        {
          panel_template: '<p>old</p>',
          embeddable_id: 'p1',
        }
      );
      const result = results[0] as ToolResult;
      if (!isErrorResult(result)) throw new Error('Expected error result');
      expect(result.data.message).toContain('p1');
    });
  });

  describe('prompt path', () => {
    const existing = {
      panel_template: '<p>old</p>',
      esql_query: 'FROM logs',
      panel_title: 'My Panel',
      embeddable_id: 'p1',
    };

    it('calls resolver and stores generated template', async () => {
      const { ctx } = await callHandler({ embeddable_id: 'p1', prompt: 'Show KPIs' }, existing);
      expect(mockResolver).toHaveBeenCalledWith(expect.objectContaining({ prompt: 'Show KPIs' }));
      expect(ctx.update).toHaveBeenCalledWith(
        'att-1',
        expect.objectContaining({
          data: expect.objectContaining({ panel_template: '<div>generated</div>' }),
        }),
        ATTACHMENT_REF_ACTOR.agent
      );
    });

    it('does not sample esqlQuery when only prompt is provided (style change)', async () => {
      await callHandler({ embeddable_id: 'p1', prompt: 'Make colors more vivid' }, existing);
      expect(mockResolver).toHaveBeenCalledWith(expect.objectContaining({ esqlQuery: undefined }));
    });

    it('passes existing template as context to the resolver', async () => {
      await callHandler({ embeddable_id: 'p1', prompt: 'Make colors more vivid' }, existing);
      expect(mockResolver).toHaveBeenCalledWith(
        expect.objectContaining({ existingTemplate: '<p>old</p>' })
      );
    });

    it('samples esqlQuery when query is also changing', async () => {
      await callHandler(
        { embeddable_id: 'p1', prompt: 'Show revenue by region', esqlQuery: 'FROM metrics' },
        existing
      );
      expect(mockResolver).toHaveBeenCalledWith(
        expect.objectContaining({ esqlQuery: 'FROM metrics' })
      );
    });

    it('returns error when resolver throws', async () => {
      mockResolver.mockRejectedValue(new Error('LLM failure'));
      const { results } = await callHandler({ embeddable_id: 'p1', prompt: 'Show KPIs' }, existing);
      expect(results[0].type).toBe(ToolResultType.error);
      const result = results[0] as ToolResult;
      if (!isErrorResult(result)) throw new Error('Expected error result');
      expect(result.data.message).toMatch(/LLM failure/);
    });
  });

  describe('query-only path', () => {
    const existing = {
      panel_template: '<p>old</p>',
      esql_query: 'FROM logs',
      panel_title: 'My Panel',
      embeddable_id: 'p1',
    };

    it('updates esqlQuery and preserves existing template when no prompt', async () => {
      const { ctx } = await callHandler(
        { embeddable_id: 'p1', esqlQuery: 'FROM metrics' },
        existing
      );
      expect(mockResolver).not.toHaveBeenCalled();
      expect(ctx.update).toHaveBeenCalledWith(
        'att-1',
        expect.objectContaining({
          data: expect.objectContaining({
            panel_template: '<p>old</p>',
            esql_query: 'FROM metrics',
          }),
        }),
        ATTACHMENT_REF_ACTOR.agent
      );
    });

    it('clears esqlQuery when null is passed', async () => {
      const { ctx } = await callHandler({ embeddable_id: 'p1', esqlQuery: null }, existing);
      expect(ctx.update).toHaveBeenCalledWith(
        'att-1',
        expect.objectContaining({
          data: expect.objectContaining({ esql_query: undefined }),
        }),
        ATTACHMENT_REF_ACTOR.agent
      );
    });
  });

  describe('metadata preservation', () => {
    const existing = {
      panel_template: '<p>old</p>',
      esql_query: 'FROM logs',
      panel_title: 'My Panel',
      embeddable_id: 'p1',
    };

    it('preserves panel_title and embeddable_id', async () => {
      const { ctx } = await callHandler({ embeddable_id: 'p1', prompt: 'Show KPIs' }, existing);
      expect(ctx.update).toHaveBeenCalledWith(
        'att-1',
        expect.objectContaining({
          data: expect.objectContaining({
            panel_title: 'My Panel',
            embeddable_id: 'p1',
          }),
        }),
        ATTACHMENT_REF_ACTOR.agent
      );
    });

    it('returns success on valid update', async () => {
      const { results } = await callHandler({ embeddable_id: 'p1', prompt: 'Show KPIs' }, existing);
      expect(results[0].type).toBe(ToolResultType.other);
    });
  });

  describe('render coordinates', () => {
    const existing = {
      panel_template: '<p>old</p>',
      esql_query: 'FROM logs',
      panel_title: 'My Panel',
      embeddable_id: 'p1',
    };

    // Without these the agent cannot emit `<render_attachment id version />`, and no preview card
    // is rendered for the round.
    it('returns the attachment id and the newly created version', async () => {
      const { results } = await callHandler({ embeddable_id: 'p1', prompt: 'Show KPIs' }, existing);
      expect(results[0].data).toEqual(
        expect.objectContaining({ attachment_id: 'att-1', version: 2 })
      );
    });

    it('omits the version when the update produced no new one', async () => {
      const tool = createUpdateCustomContentTool();
      const ctx = makeContext(existing);
      ctx.attachments.update = jest.fn().mockResolvedValue(undefined);

      type HandlerParams = Parameters<typeof tool.handler>[0];
      type HandlerCtx = Parameters<typeof tool.handler>[1];
      const ret = await tool.handler(
        { embeddable_id: 'p1', prompt: 'Show KPIs' } as HandlerParams,
        ctx as unknown as HandlerCtx
      );
      if (!('results' in ret)) throw new Error('Unexpected HITL return from tool handler');

      expect(ret.results[0].data).toEqual(
        expect.objectContaining({ attachment_id: 'att-1', version: undefined })
      );
    });
  });

  describe('multi-panel disambiguation', () => {
    it('targets the attachment whose embeddable_id matches, ignoring other panels', async () => {
      const panelA = {
        id: 'att-A',
        type: CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
        current_version: 1,
        versions: [
          {
            version: 1,
            data: { panel_template: '<p>a</p>', panel_title: 'A', embeddable_id: 'p1' },
          },
        ],
      };
      const panelB = {
        id: 'att-B',
        type: CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
        current_version: 1,
        versions: [
          {
            version: 1,
            data: { panel_template: '<p>b</p>', panel_title: 'B', embeddable_id: 'p2' },
          },
        ],
      };
      const update = jest.fn().mockResolvedValue({ ...panelB, current_version: 2 });
      const ctx = {
        attachments: { getAll: jest.fn().mockReturnValue([panelA, panelB]), update },
        logger: { warn: jest.fn(), error: jest.fn() },
        esClient: {},
        modelProvider: {},
      };

      const tool = createUpdateCustomContentTool();
      type HandlerParams = Parameters<typeof tool.handler>[0];
      type HandlerCtx = Parameters<typeof tool.handler>[1];
      await tool.handler(
        { embeddable_id: 'p2', prompt: 'Make it red' } as HandlerParams,
        ctx as unknown as HandlerCtx
      );

      expect(update).toHaveBeenCalledWith('att-B', expect.anything(), expect.anything());
      expect(update).not.toHaveBeenCalledWith('att-A', expect.anything(), expect.anything());
    });

    it('returns error when embeddable_id does not match any attachment', async () => {
      const { results } = await callHandler(
        { embeddable_id: 'unknown', prompt: 'Show KPIs' },
        { panel_template: '<p>old</p>', embeddable_id: 'p1' }
      );
      expect(results[0].type).toBe(ToolResultType.error);
    });
  });
});
