/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToastsStart } from '@kbn/core-notifications-browser';
import type { BrowserToolDefinition, BrowserToolHandlerReturn } from '@kbn/agent-builder-browser';
import type { BrowserToolCallEvent, BrowserToolResultPayload } from '@kbn/agent-builder-common';
import type { ChatService } from '../chat';
import type { BrowserToolRegistry } from './browser_tool_registry';
import type { PageScheduler } from './page_scheduler';

export interface DispatchContext {
  clientId: string;
  executionId: string;
  conversationId?: string;
  agentId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  legacyTools?: Array<BrowserToolDefinition<any>>;
  streamSignal: AbortSignal;
}

interface BrowserToolDispatcherDeps {
  registry: BrowserToolRegistry;
  chatService: Pick<ChatService, 'postBrowserToolResult'>;
  scheduler: PageScheduler;
  toasts?: ToastsStart;
  now?: () => number;
}

interface CompletedCall {
  result: BrowserToolResultPayload;
  completedAt: number;
}

const COMPLETED_TTL_MS = 10 * 60 * 1000;
const COMPLETED_MAX_ENTRIES = 200;
const CANCELLED_MESSAGE = 'cancelled: the conversation stream was aborted';
/** Delays before each retry of a failed result post. */
const POST_RETRY_DELAYS_MS = [500, 1500];

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const getHttpStatus = (error: unknown): number | undefined => {
  const err = error as
    | { response?: { status?: number }; body?: { statusCode?: number } }
    | undefined;
  return err?.response?.status ?? err?.body?.statusCode;
};

/** Network errors (no status) and server errors are worth retrying; other statuses are final. */
const isRetryablePostError = (error: unknown): boolean => {
  const status = getHttpStatus(error);
  return status === undefined || status >= 500;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Converts the server-time `expires_at` to a deadline on the browser clock: the offset between
 * the browser clock at receipt and the server's `issued_at` absorbs clock skew (and transit time).
 * An unparseable `expires_at` yields NaN, which callers treat as expired.
 */
const getClientDeadline = (event: BrowserToolCallEvent, receivedAt: number): number => {
  const issuedAt = Date.parse(event.data.issued_at);
  const offset = Number.isNaN(issuedAt) ? 0 : receivedAt - issuedAt;
  return Date.parse(event.data.expires_at) + offset;
};

const toResultPayload = (value: void | BrowserToolHandlerReturn): BrowserToolResultPayload => {
  if (!value) {
    return { status: 'ok' };
  }
  return {
    status: 'ok',
    ...(value.content !== undefined ? { content: value.content } : {}),
    ...(value.images
      ? {
          images: value.images.map(({ mimeType, ...rest }) => ({ mime_type: mimeType, ...rest })),
        }
      : {}),
  };
};

/**
 * Executes `browser_tool_call` events emitted by the agent and posts their results back.
 */
export class BrowserToolDispatcher {
  private readonly registry: BrowserToolRegistry;
  private readonly chatService: Pick<ChatService, 'postBrowserToolResult'>;
  private readonly scheduler: PageScheduler;
  private readonly toasts?: ToastsStart;
  private readonly now: () => number;

  private readonly inFlight = new Set<string>();
  private readonly completed = new Map<string, CompletedCall>();

  constructor({
    registry,
    chatService,
    scheduler,
    toasts,
    now = Date.now,
  }: BrowserToolDispatcherDeps) {
    this.registry = registry;
    this.chatService = chatService;
    this.scheduler = scheduler;
    this.toasts = toasts;
    this.now = now;
  }

  /** Fire-and-forget: every error is handled internally. */
  dispatch(event: BrowserToolCallEvent, context: DispatchContext): void {
    const { tool_call_id: toolCallId, client_id: clientId } = event.data;
    if (clientId !== undefined && clientId !== context.clientId) {
      return;
    }

    const key = `${context.executionId}:${toolCallId}`;
    const completed = this.completed.get(key);
    if (completed) {
      void this.post(event, context, completed.result);
      return;
    }
    if (this.inFlight.has(key)) {
      return;
    }

    this.inFlight.add(key);
    const deadline = getClientDeadline(event, this.now());
    void this.execute(event, context, deadline)
      .then((result) => {
        this.storeCompleted(key, result);
        return this.post(event, context, result);
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error(`Browser tool call ${toolCallId} failed unexpectedly`, error);
      })
      .finally(() => {
        this.inFlight.delete(key);
      });
  }

  private async execute(
    event: BrowserToolCallEvent,
    context: DispatchContext,
    deadline: number
  ): Promise<BrowserToolResultPayload> {
    const { tool_id: toolId, params } = event.data;

    // negated so that a NaN deadline counts as expired
    if (!(deadline > this.now())) {
      return { status: 'error', message: 'expired before execution' };
    }

    const tool =
      context.legacyTools?.find((legacyTool) => legacyTool.id === toolId) ??
      this.registry.get(toolId);
    if (!tool) {
      return { status: 'error', message: `unknown browser tool "${toolId}"` };
    }

    const parsed = tool.schema.safeParse(params);
    if (!parsed.success) {
      return { status: 'error', message: parsed.error.message };
    }

    return this.scheduler.run(() => this.runHandler(tool, parsed.data, event, context, deadline));
  }

  private async runHandler(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tool: BrowserToolDefinition<any>,
    params: unknown,
    event: BrowserToolCallEvent,
    context: DispatchContext,
    deadline: number
  ): Promise<BrowserToolResultPayload> {
    // the call may have waited in the queue past its deadline
    const remainingMs = deadline - this.now();
    if (!(remainingMs > 0)) {
      return { status: 'error', message: 'expired before execution' };
    }
    if (context.streamSignal.aborted) {
      return { status: 'error', message: CANCELLED_MESSAGE };
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new Error('expired during execution')),
      remainingMs
    );
    const onStreamAbort = () => controller.abort(new Error(CANCELLED_MESSAGE));
    context.streamSignal.addEventListener('abort', onStreamAbort, { once: true });

    // settles when the call is interrupted (deadline or stream abort), so the queue is released
    // even if the handler never settles
    const interrupted = new Promise<BrowserToolResultPayload>((resolve) => {
      controller.signal.addEventListener(
        'abort',
        () => resolve({ status: 'error', message: getErrorMessage(controller.signal.reason) }),
        { once: true }
      );
    });

    try {
      const handlerResult = Promise.resolve()
        .then(() =>
          tool.handler(params, {
            toolId: tool.id,
            toolCallId: event.data.tool_call_id,
            executionId: context.executionId,
            conversationId: context.conversationId,
            agentId: context.agentId,
            signal: controller.signal,
          })
        )
        .then(toResultPayload);
      // a late return after the interruption is discarded
      return await Promise.race([handlerResult, interrupted]);
    } catch (error) {
      const message = getErrorMessage(error);
      this.toasts?.addDanger({ title: `Browser tool "${tool.id}" failed`, text: message });
      return { status: 'error', message };
    } finally {
      clearTimeout(timeout);
      context.streamSignal.removeEventListener('abort', onStreamAbort);
    }
  }

  private async post(
    event: BrowserToolCallEvent,
    context: DispatchContext,
    result: BrowserToolResultPayload
  ): Promise<void> {
    for (let attempt = 0; ; attempt++) {
      try {
        // 404 and 409 resolve as 'final': nothing to retry
        await this.chatService.postBrowserToolResult({
          executionId: context.executionId,
          toolCallId: event.data.tool_call_id,
          clientId: context.clientId,
          result,
        });
        return;
      } catch (error) {
        if (attempt < POST_RETRY_DELAYS_MS.length && isRetryablePostError(error)) {
          await sleep(POST_RETRY_DELAYS_MS[attempt]);
          continue;
        }
        // eslint-disable-next-line no-console
        console.error(
          `Failed to post result of browser tool call ${event.data.tool_call_id}`,
          error
        );
        return;
      }
    }
  }

  private storeCompleted(key: string, result: BrowserToolResultPayload) {
    const now = this.now();
    for (const [existingKey, entry] of this.completed) {
      // entries are kept in insertion order, so the oldest come first
      if (
        now - entry.completedAt <= COMPLETED_TTL_MS &&
        this.completed.size < COMPLETED_MAX_ENTRIES
      ) {
        break;
      }
      this.completed.delete(existingKey);
    }
    this.completed.set(key, { result, completedAt: now });
  }
}
