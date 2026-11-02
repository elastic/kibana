/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generic "task pod" HTTP server. Task Manager (or a poking service) spawns one of these
 * processes and keeps it on standby; it never execs a one-shot CLI per run. Every task type's
 * `createTaskRunner` lives inside this one bundle, keyed by `taskType` in a `TaskRegistry`
 * built by a pod entry point (see `pod/entries/*.ts`).
 */

import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';

export interface RunRequestBody {
  readonly taskType: string;
  readonly taskInstance: {
    readonly id: string;
    readonly params: Record<string, unknown>;
    readonly state: Record<string, unknown>;
    readonly attempts: number;
    readonly scheduledAt?: string;
    readonly startedAt?: string;
    readonly runAt?: string;
  };
  readonly executionUuid: string;
  readonly apiKey?: string;
  readonly spaceId: string;
  readonly timeoutMs?: number;
}

/**
 * What a pod entry hands the HTTP layer per task type: build the real `RunContext` (including
 * `fakeRequest`) from the run request, and return the task's own `{run, cancel?}` object.
 */
export type TaskRunner = (ctx: RunRequestBody) => { run(): Promise<unknown>; cancel?(): Promise<unknown> };
export type TaskRegistry = Map<string, TaskRunner>;

interface InFlight {
  readonly abortController: AbortController;
  readonly runner: { run(): Promise<unknown>; cancel?(): Promise<unknown> };
}

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });

const sendJson = (res: ServerResponse, status: number, body: unknown) => {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(json) });
  res.end(json);
};

export const startPod = ({ registry, port }: { registry: TaskRegistry; port: number }): void => {
  const inFlight = new Map<string, InFlight>();

  const server = createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/health') {
        sendJson(res, 200, { inFlight: inFlight.size, rss: process.memoryUsage().rss });
        return;
      }

      if (req.method === 'POST' && req.url === '/run') {
        const body = JSON.parse(await readBody(req)) as RunRequestBody;
        const taskRunner = registry.get(body.taskType);
        if (!taskRunner) {
          sendJson(res, 404, { error: `unregistered task type '${body.taskType}'` });
          return;
        }

        const abortController = new AbortController();
        const timer = body.timeoutMs ? setTimeout(() => abortController.abort(), body.timeoutMs) : undefined;
        const executionUuid = body.executionUuid;
        const capturedFields: Record<string, unknown>[] = [];

        const runner = taskRunner({
          ...body,
          signal: abortController.signal,
          setCustomTaskRunEventFields: (fields: Record<string, unknown>) => {
            capturedFields.push(fields);
          },
        } as never);
        inFlight.set(executionUuid, { abortController, runner });

        try {
          const result = await runner.run();
          sendJson(res, 200, { outcome: 'ok', result, taskRunEventFields: capturedFields.at(-1) ?? {} });
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          sendJson(res, 200, {
            outcome: 'error',
            error: { message: err.message, unrecoverable: (err as { isUnrecoverable?: boolean }).isUnrecoverable },
            taskRunEventFields: capturedFields.at(-1) ?? {},
          });
        } finally {
          if (timer) clearTimeout(timer);
          inFlight.delete(executionUuid);
        }
        return;
      }

      if (req.method === 'POST' && req.url?.startsWith('/cancel/')) {
        const executionUuid = req.url.slice('/cancel/'.length);
        const entry = inFlight.get(executionUuid);
        if (!entry) {
          sendJson(res, 404, { error: 'no such in-flight run' });
          return;
        }
        entry.abortController.abort();
        await entry.runner.cancel?.();
        sendJson(res, 200, { outcome: 'cancelled' });
        return;
      }

      sendJson(res, 404, { error: 'not found' });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      sendJson(res, 500, { error: err.message });
    }
  });

  server.listen(port, () => {
    process.stdout.write('READY\n');
  });
};
