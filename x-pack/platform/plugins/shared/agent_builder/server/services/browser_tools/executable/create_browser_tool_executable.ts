/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';
import type { Logger } from '@kbn/logging';
import {
  BrowserToolCallStatus,
  DEFAULT_BROWSER_TOOL_TIMEOUT_MS,
  ToolOrigin,
  ToolType,
} from '@kbn/agent-builder-common';
import type { BrowserToolDescriptor } from '@kbn/agent-builder-common';
import { createErrorResult } from '@kbn/agent-builder-server';
import type { ScopedRunner, ToolHandlerFn } from '@kbn/agent-builder-server';
import type { BrowserToolsRunContext } from '@kbn/agent-builder-server/runner';
import type { ExecutableToolWithOrigin } from '@kbn/agent-builder-server/runner/tool_manager';
import { waitForBrowserToolResult } from './wait_for_result';
import { normalizeBrowserToolResult } from './normalize_result';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Creates the executable for a browser tool: its handler records a pending call, asks the
 * sending client to run it, and waits for the browser's answer.
 */
export const createBrowserToolExecutable = ({
  descriptor,
  clientId,
  executionId,
  spaceId,
  browserTools,
  runner,
  logger,
}: {
  descriptor: BrowserToolDescriptor;
  clientId?: string;
  executionId: string;
  spaceId: string;
  browserTools: BrowserToolsRunContext;
  runner: ScopedRunner;
  logger: Logger;
}): ExecutableToolWithOrigin => {
  const toolId = descriptor.id;
  const timeoutMs = descriptor.timeout_ms ?? DEFAULT_BROWSER_TOOL_TIMEOUT_MS;
  const { callClient } = browserTools;

  const getSchema = () =>
    (fromJSONSchema(descriptor.schema as Record<string, unknown>) ??
      z.object({})) as z.ZodObject<any>;

  const markCall = (
    toolCallId: string,
    status: BrowserToolCallStatus.consumed | BrowserToolCallStatus.expired
  ) => {
    callClient.setStatus(executionId, toolCallId, status).catch((error) => {
      logger.warn(
        `Failed to mark browser tool call [${toolCallId}] of execution [${executionId}] as ${status}: ${errorMessage(
          error
        )}`
      );
    });
  };

  const handler: ToolHandlerFn = async (params, ctx) => {
    const { toolCallId } = ctx.callContext;
    try {
      const expiresAt = new Date(Date.now() + timeoutMs);

      await callClient.create({
        executionId,
        toolCallId,
        clientId,
        spaceId,
        toolId,
        expiresAt: expiresAt.toISOString(),
      });

      ctx.events.emitBrowserToolCall({
        params,
        clientId,
        expiresAt: expiresAt.toISOString(),
      });

      const outcome = await waitForBrowserToolResult({
        callClient,
        logger,
        executionId,
        toolCallId,
        expiresAt,
        abortSignal: ctx.abortSignal,
      });

      switch (outcome.type) {
        case 'answered':
          markCall(toolCallId, BrowserToolCallStatus.consumed);
          return {
            results: await normalizeBrowserToolResult({
              result: outcome.result,
              uploadImage: (image) =>
                browserTools.uploadImage({
                  image,
                  request: ctx.request,
                  attachments: ctx.attachments,
                  toolId,
                }),
            }),
          };
        case 'timeout':
          markCall(toolCallId, BrowserToolCallStatus.expired);
          return {
            results: [
              createErrorResult(`Browser did not answer within ${Math.round(timeoutMs / 1000)} s`),
            ],
          };
        case 'aborted':
          markCall(toolCallId, BrowserToolCallStatus.expired);
          return {
            results: [createErrorResult('Execution aborted while waiting for the browser')],
          };
      }
    } catch (error) {
      logger.warn(`Browser tool [${toolId}] call [${toolCallId}] failed: ${errorMessage(error)}`);
      return {
        results: [createErrorResult(`Browser tool ${toolId} failed: ${errorMessage(error)}`)],
      };
    }
  };

  return {
    id: toolId,
    type: ToolType.builtin,
    origin: ToolOrigin.internal,
    description: descriptor.description,
    tags: [],
    configuration: {},
    readonly: true,
    experimental: false,
    browser: true,
    getSchema,
    execute: async (params) => {
      return runner.runInternalTool({
        ...params,
        tool: {
          id: toolId,
          type: ToolType.builtin,
          description: descriptor.description,
          tags: [],
          configuration: {},
          readonly: true,
          experimental: false,
          confirmation: { askUser: 'never' },
          isAvailable: async () => ({ status: 'available' as const }),
          getSchema,
          getHandler: () => handler,
        },
      });
    },
  };
};
