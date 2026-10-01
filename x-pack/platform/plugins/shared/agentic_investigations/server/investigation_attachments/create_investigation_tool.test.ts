/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolHandlerContext, ToolHandlerStandardReturn } from '@kbn/agent-builder-server';
import type { IUiSettingsClient } from '@kbn/core/server';
import { createInvestigationTool, getToolConversationId } from './create_investigation_tool';

const schema = z.object({ value: z.string().max(10) });

const createTool = ({
  assertPrivilege = jest.fn().mockResolvedValue(undefined),
  handler = jest.fn().mockResolvedValue({ results: [] }),
}: {
  assertPrivilege?: jest.Mock;
  handler?: jest.Mock;
} = {}) =>
  createInvestigationTool({
    id: 'investigations.test',
    description: 'Test tool',
    schema,
    annotations: {
      title: 'Test',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    assertPrivilege,
    logger: loggerMock.create(),
    handler,
  });

const contextWith = (stack: ToolHandlerContext['runContext']['stack']) =>
  ({
    request: httpServerMock.createKibanaRequest(),
    runContext: { runId: 'run-1', stack },
  } as unknown as ToolHandlerContext);

const run = async (tool: ReturnType<typeof createTool>, context: ToolHandlerContext) =>
  (await tool.handler({ value: 'x' }, context)) as ToolHandlerStandardReturn;

describe('getToolConversationId', () => {
  it('returns the innermost agent conversation', () => {
    expect(
      getToolConversationId({
        runContext: {
          stack: [
            { type: 'agent', agentId: 'outer', conversationId: 'conv-outer' },
            { type: 'tool', toolId: 'x' },
            { type: 'agent', agentId: 'inner', conversationId: 'conv-inner' },
            { type: 'tool', toolId: 'y' },
          ],
        },
      })
    ).toBe('conv-inner');
  });

  it('does not fall back to an outer conversation when the innermost agent has none', () => {
    expect(
      getToolConversationId({
        runContext: {
          stack: [
            { type: 'agent', agentId: 'outer', conversationId: 'conv-outer' },
            { type: 'agent', agentId: 'standalone' },
          ],
        },
      })
    ).toBeUndefined();
  });

  it('is undefined for a standalone run', () => {
    expect(getToolConversationId({ runContext: { stack: [] } })).toBeUndefined();
  });
});

describe('createInvestigationTool', () => {
  it('is a builtin tool hidden from MCP', () => {
    const tool = createTool();

    expect(tool).toMatchObject({ id: 'investigations.test', excludeFromMcp: true });
    expect(tool.availability?.cacheMode).toBe('none');
  });

  it('is unavailable to a principal without the privilege', async () => {
    const tool = createTool({
      assertPrivilege: jest.fn().mockRejectedValue(new Error('Missing privilege')),
    });

    await expect(
      tool.availability?.handler({
        request: httpServerMock.createKibanaRequest(),
        spaceId: 'default',
        uiSettings: {} as IUiSettingsClient,
      })
    ).resolves.toEqual({ status: 'unavailable', reason: 'Missing privilege' });
  });

  it('refuses to run outside a conversation', async () => {
    const handler = jest.fn();
    const tool = createTool({ handler });

    const { results } = await run(tool, contextWith([]));

    expect(handler).not.toHaveBeenCalled();
    expect(results[0].type).toBe(ToolResultType.error);
  });

  it('refuses to run without the privilege', async () => {
    const handler = jest.fn();
    const tool = createTool({
      handler,
      assertPrivilege: jest.fn().mockRejectedValue(new Error('Missing privilege')),
    });

    const { results } = await run(
      tool,
      contextWith([{ type: 'agent', agentId: 'a', conversationId: 'conv-1' }])
    );

    expect(handler).not.toHaveBeenCalled();
    expect(results[0]).toMatchObject({
      type: ToolResultType.error,
      data: { message: 'Missing privilege' },
    });
  });

  it('passes the conversation id and turns a handler failure into an error result', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('index unavailable'));
    const tool = createTool({ handler });
    const context = contextWith([{ type: 'agent', agentId: 'a', conversationId: 'conv-1' }]);

    const { results } = await run(tool, context);

    expect(handler).toHaveBeenCalledWith({ value: 'x' }, { context, conversationId: 'conv-1' });
    expect(results[0]).toMatchObject({
      type: ToolResultType.error,
      data: { message: 'index unavailable' },
    });
  });
});
