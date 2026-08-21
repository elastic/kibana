/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
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
  const update = jest.fn().mockResolvedValue(undefined);
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
  params: { prompt?: string; esqlQuery?: string | null },
  attachmentData?: Record<string, unknown>
) => {
  const tool = createUpdateCustomContentTool();
  const ctx = makeContext(attachmentData);
  const ret = await tool.handler(params as any, ctx as any);
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
      const { results, ctx } = await callHandler({ prompt: 'Show KPIs' });
      expect(results[0].type).toBe(ToolResultType.error);
      expect(ctx.update).not.toHaveBeenCalled();
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
      const { ctx } = await callHandler({ prompt: 'Show KPIs' }, existing);
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
      await callHandler({ prompt: 'Make colors more vivid' }, existing);
      expect(mockResolver).toHaveBeenCalledWith(expect.objectContaining({ esqlQuery: undefined }));
    });

    it('passes existing template as context to the resolver', async () => {
      await callHandler({ prompt: 'Make colors more vivid' }, existing);
      expect(mockResolver).toHaveBeenCalledWith(
        expect.objectContaining({ existingTemplate: '<p>old</p>' })
      );
    });

    it('samples esqlQuery when query is also changing', async () => {
      await callHandler({ prompt: 'Show revenue by region', esqlQuery: 'FROM metrics' }, existing);
      expect(mockResolver).toHaveBeenCalledWith(
        expect.objectContaining({ esqlQuery: 'FROM metrics' })
      );
    });

    it('returns error when resolver throws', async () => {
      mockResolver.mockRejectedValue(new Error('LLM failure'));
      const { results } = await callHandler({ prompt: 'Show KPIs' }, existing);
      expect(results[0].type).toBe(ToolResultType.error);
      expect((results[0] as any).data.message).toMatch(/LLM failure/);
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
      const { ctx } = await callHandler({ esqlQuery: 'FROM metrics' }, existing);
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
      const { ctx } = await callHandler({ esqlQuery: null }, existing);
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
      const { ctx } = await callHandler({ prompt: 'Show KPIs' }, existing);
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
      const { results } = await callHandler({ prompt: 'Show KPIs' }, existing);
      expect(results[0].type).toBe(ToolResultType.other);
    });
  });
});
