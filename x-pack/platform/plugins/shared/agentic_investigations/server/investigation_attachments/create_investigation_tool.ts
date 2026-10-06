/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { z, ZodObject } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type {
  BuiltinToolDefinition,
  RunContextStackEntry,
  ToolHandlerContext,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server';
import { createErrorResult } from '@kbn/agent-builder-server';

/**
 * Conversation the tool runs in: that of the innermost agent on the run stack, whose run owns
 * `context.attachments`. Undefined when that agent runs standalone, even inside an outer
 * conversation, so the index write never targets a conversation the attachment state is not for.
 */
export const getToolConversationId = (context: {
  runContext: { stack: RunContextStackEntry[] };
}): string | undefined =>
  context.runContext.stack.findLast(
    (entry): entry is Extract<RunContextStackEntry, { type: 'agent' }> => entry.type === 'agent'
  )?.conversationId;

export interface InvestigationToolOptions<TSchema extends ZodObject> {
  id: string;
  description: string;
  schema: TSchema;
  annotations: BuiltinToolDefinition['annotations'];
  /** Throws when the run's principal may not use the tool. Checked for availability and per call. */
  assertPrivilege: (request: KibanaRequest) => Promise<void>;
  logger: Logger;
  handler: (
    params: z.infer<TSchema>,
    args: { context: ToolHandlerContext; conversationId: string }
  ) => Promise<ToolHandlerStandardReturn>;
}

/**
 * Builtin agent tool that writes an investigation attachment. Hidden from principals without the
 * privilege, refuses to run outside a conversation, and turns a failed privilege check into an
 * error result rather than writing. The id has to be on Agent Builder's builtin tool allow-list.
 */
export const createInvestigationTool = <TSchema extends ZodObject>({
  id,
  description,
  schema,
  annotations,
  assertPrivilege,
  logger,
  handler,
}: InvestigationToolOptions<TSchema>): BuiltinToolDefinition<TSchema> => ({
  id,
  type: ToolType.builtin,
  description,
  schema,
  annotations,
  tags: ['investigation'],
  excludeFromMcp: true,
  availability: {
    // Per principal, so it cannot be cached per space.
    cacheMode: 'none',
    handler: async ({ request }) => {
      try {
        await assertPrivilege(request);
        return { status: 'available' };
      } catch (error) {
        return { status: 'unavailable', reason: errorMessage(error) };
      }
    },
  },
  handler: async (params, context) => {
    const conversationId = getToolConversationId(context);
    if (!conversationId) {
      return {
        results: [createErrorResult(`${id} can only be used inside a conversation.`)],
      };
    }

    try {
      await assertPrivilege(context.request);
    } catch (error) {
      return { results: [createErrorResult(errorMessage(error))] };
    }

    try {
      return await handler(params, { context, conversationId });
    } catch (error) {
      logger.warn(`Tool ${id} failed for conversation ${conversationId}: ${errorMessage(error)}`);
      return { results: [createErrorResult(errorMessage(error))] };
    }
  },
});

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
