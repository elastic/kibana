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
    logger: { warn: jest.fn() },
    update,
    attachment,
  };
};

const callHandler = async (
  params: { template?: string; esqlQuery?: string | null },
  attachmentData?: Record<string, unknown>
) => {
  const tool = createUpdateCustomContentTool();
  const ctx = makeContext(attachmentData);
  const ret = await tool.handler(params as any, ctx as any);
  if (!('results' in ret)) throw new Error('Unexpected HITL return from tool handler');
  return { results: ret.results, ctx };
};

describe('createUpdateCustomContentTool handler', () => {
  describe('script tag rejection', () => {
    it('rejects a template containing <script>', async () => {
      const { results } = await callHandler({ template: '<script>alert(1)</script>' });
      expect(results[0].type).toBe(ToolResultType.error);
      expect((results[0] as any).data.message).toMatch(/script/i);
    });

    it('rejects <script> with attributes', async () => {
      const { results } = await callHandler({ template: '<script src="x.js"></script>' });
      expect(results[0].type).toBe(ToolResultType.error);
    });

    it('rejects self-closing <script/>', async () => {
      const { results } = await callHandler({ template: '<script/>' });
      expect(results[0].type).toBe(ToolResultType.error);
    });

    it('allows a template with no script tags', async () => {
      const { results } = await callHandler(
        { template: '<div>{{ value }}</div>' },
        { panel_template: '', embeddable_id: 'p1' }
      );
      expect(results[0].type).toBe(ToolResultType.other);
    });
  });

  describe('missing attachment', () => {
    it('returns an error when no context attachment exists', async () => {
      const { results, ctx } = await callHandler({ template: '<div/>' });
      expect(results[0].type).toBe(ToolResultType.error);
      expect(ctx.update).not.toHaveBeenCalled();
    });
  });

  describe('data merging', () => {
    const existing = {
      panel_template: '<p>old</p>',
      esql_query: 'FROM logs',
      panel_title: 'My Panel',
      embeddable_id: 'p1',
    };

    it('updates only template when esqlQuery is omitted', async () => {
      const { ctx } = await callHandler({ template: '<p>new</p>' }, existing);
      expect(ctx.update).toHaveBeenCalledWith(
        'att-1',
        expect.objectContaining({
          data: expect.objectContaining({
            panel_template: '<p>new</p>',
            esql_query: 'FROM logs',
          }),
        }),
        ATTACHMENT_REF_ACTOR.agent
      );
    });

    it('updates only esqlQuery when template is omitted', async () => {
      const { ctx } = await callHandler({ esqlQuery: 'FROM metrics' }, existing);
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

    it('updates both template and esqlQuery together', async () => {
      const { ctx } = await callHandler(
        { template: '<p>new</p>', esqlQuery: 'FROM metrics' },
        existing
      );
      expect(ctx.update).toHaveBeenCalledWith(
        'att-1',
        expect.objectContaining({
          data: expect.objectContaining({
            panel_template: '<p>new</p>',
            esql_query: 'FROM metrics',
          }),
        }),
        ATTACHMENT_REF_ACTOR.agent
      );
    });

    it('preserves panel_title and embeddable_id', async () => {
      const { ctx } = await callHandler({ template: '<p>x</p>' }, existing);
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
      const { results } = await callHandler({ template: '<p>x</p>' }, existing);
      expect(results[0].type).toBe(ToolResultType.other);
    });
  });
});
