/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Logger } from '@kbn/logging';
import { serializeTaskRunError } from '../task_running/errors';
import type { TaskProcessRunRequest, TaskProcessRunResponse } from './wire';
import { MAX_TIMER_MS, reviveTaskInstance, serializeRunResult } from './wire';
import { buildTaskFakeRequest } from '../task_running/fake_request_factory';
import type { RunContext, CancellableTask } from '../task';

/** What the server needs of a task definition: a way to create the run's task. */
export interface TaskProcessTaskDefinition {
  createTaskRunner: (context: RunContext) => CancellableTask;
}

interface InFlight {
  readonly abortController: AbortController;
  readonly task: { cancel?(): Promise<unknown> };
}

const MAX_BODY_BYTES = 64 * 1024 * 1024;

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error(`request body exceeds ${MAX_BODY_BYTES} bytes`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    // Decode once at the end: a multi-byte character may be split across chunks.
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

const sendJson = (res: ServerResponse, status: number, body: unknown) => {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(json),
  });
  res.end(json);
};

/** Thrown for runs the process refuses before starting them; the HTTP status tells Kibana to retry. */
class RefusedRun extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

const isSameSecret = (received: string | undefined, expected: string) => {
  const a = Buffer.from(received ?? '');
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

export const startTaskProcessServer = ({
  taskDefinitions,
  port,
  logger,
  kibanaVersion,
  authToken,
  onListening,
  onShutdown,
}: {
  taskDefinitions: Map<string, TaskProcessTaskDefinition>;
  port: number;
  logger: Logger;
  /** The Kibana version this process was built for; runs from another version are refused. */
  kibanaVersion: string;
  /** Bearer token required on `/run` and `/cancel`; `/health` stays open. */
  authToken?: string;
  /** Called with the port once listening, which matters when the OS picked it. */
  onListening?: (port: number) => void;
  /** Called once the in-flight runs have finished and before the process exits. */
  onShutdown?: () => Promise<void>;
}) => {
  const inFlight = new Map<string, InFlight>();
  let draining = false;

  const handleRun = async (
    body: TaskProcessRunRequest
  ): Promise<TaskProcessRunResponse | undefined> => {
    const definition = taskDefinitions.get(body.taskType);
    if (!definition) return undefined;
    if (draining) throw new RefusedRun(503, 'task process is shutting down');
    if (body.kibanaVersion && body.kibanaVersion !== kibanaVersion) {
      throw new RefusedRun(
        409,
        `task process was built for Kibana ${kibanaVersion}, run is from ${body.kibanaVersion}`
      );
    }

    const abortController = new AbortController();
    // Kibana stops waiting at the task's deadline; stop the work then too.
    const deadlineMs = body.deadline ? new Date(body.deadline).getTime() - Date.now() : undefined;
    const deadlineTimer =
      deadlineMs !== undefined && Number.isFinite(deadlineMs)
        ? setTimeout(() => abortController.abort(), Math.min(Math.max(deadlineMs, 0), MAX_TIMER_MS))
        : undefined;
    const customFields: Record<string, unknown>[] = [];
    const fakeRequest = buildTaskFakeRequest({
      apiKey: body.apiKey,
      spaceId: body.spaceId,
      uiamApiKeyExternal: body.uiamApiKeyExternal,
    });

    const task = definition.createTaskRunner({
      taskInstance: reviveTaskInstance(body.taskInstance),
      fakeRequest,
      signal: abortController.signal,
      executionUuid: body.executionUuid,
      setCustomTaskRunEventFields: (fields: Record<string, unknown>) => customFields.push(fields),
    });
    inFlight.set(body.executionUuid, { abortController, task });
    try {
      const result = await task.run();
      return {
        kind: 'result',
        result: serializeRunResult(result as never),
        customTaskRunEventFields: customFields.at(-1),
      } as TaskProcessRunResponse;
    } catch (error) {
      return {
        kind: 'thrown',
        error: serializeTaskRunError(error),
        customTaskRunEventFields: customFields.at(-1),
      } as TaskProcessRunResponse;
    } finally {
      clearTimeout(deadlineTimer);
      inFlight.delete(body.executionUuid);
      try {
        await task.cleanup?.();
      } catch (error) {
        logger.warn(`Cleanup of ${body.taskType} failed: ${(error as Error).message}`);
      }
    }
  };

  const server = createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/health') {
        sendJson(res, 200, {
          inFlight: inFlight.size,
          rss: process.memoryUsage().rss,
          taskTypes: [...taskDefinitions.keys()],
        });
        return;
      }

      const isAuthorized =
        !authToken || isSameSecret(req.headers.authorization, `Bearer ${authToken}`);
      if (req.method === 'POST' && (req.url === '/run' || req.url?.startsWith('/cancel/'))) {
        if (!isAuthorized) {
          sendJson(res, 401, { error: 'unauthorized' });
          return;
        }
      }

      if (req.method === 'POST' && req.url === '/run') {
        const body = JSON.parse(await readBody(req)) as TaskProcessRunRequest;
        // Kibana hung up (it timed out or was cancelled): don't keep running for nobody.
        res.on('close', () => {
          if (!res.writableEnded) inFlight.get(body.executionUuid)?.abortController.abort();
        });
        const response = await handleRun(body);
        if (!response) {
          sendJson(res, 404, { error: `unregistered task type '${body.taskType}'` });
          return;
        }
        sendJson(res, 200, response);
        return;
      }

      if (req.method === 'POST' && req.url?.startsWith('/cancel/')) {
        const entry = inFlight.get(req.url.slice('/cancel/'.length));
        if (!entry) {
          sendJson(res, 404, { error: 'no such in-flight run' });
          return;
        }
        entry.abortController.abort();
        await entry.task.cancel?.();
        sendJson(res, 200, { outcome: 'cancelled' });
        return;
      }

      sendJson(res, 404, { error: 'not found' });
    } catch (error) {
      if (error instanceof RefusedRun) {
        sendJson(res, error.status, { error: error.message });
        return;
      }
      sendJson(res, 500, { error: (error as Error).message });
    }
  });

  // One failing background promise (a late callback after its run ended, say) must not take down
  // every run the process is serving.
  process.on('unhandledRejection', (reason) => {
    logger.error(`unhandled rejection: ${(reason as Error)?.stack ?? String(reason)}`);
  });

  // Stop taking runs, let in-flight ones finish (they stop at their own deadline), then exit.
  const shutdown = () => {
    draining = true;
    server.close();
    const waiter = setInterval(() => {
      if (inFlight.size === 0) {
        clearInterval(waiter);
        (onShutdown?.() ?? Promise.resolve())
          .catch((error) => logger.warn(`Shutdown failed: ${(error as Error).message}`))
          .finally(() => process.exit(0));
      }
    }, 100);
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  server.listen(port, () => {
    const address = server.address();
    onListening?.(typeof address === 'object' && address ? address.port : port);
  });
  return server;
};
