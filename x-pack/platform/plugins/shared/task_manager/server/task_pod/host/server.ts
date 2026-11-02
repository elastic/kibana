/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { KibanaRequest } from '@kbn/core-http-server';
import { serializeTaskRunError } from '../../task_running/errors';
import type { PodRunRequest, PodRunResponse } from '../wire';
import { reviveTaskInstance, serializeRunResult } from '../wire';
import type { CapturedTaskDefinition } from './boot_tasks_plugins';
import { enrichPodFakeRequest } from './core/small_services';
import { POD_KIBANA_VERSION } from './version';
import { PodLogger } from './logger';

const logger = new PodLogger('taskPod');

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

/** Thrown for runs the pod refuses before starting them; the HTTP status tells Kibana to retry. */
class RefusedRun extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

const matchesAny = (patterns: RegExp[], value: string) => patterns.some((p) => p.test(value));
const globToRegExp = (glob: string) =>
  new RegExp(`^${glob.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);

export const startPodServer = ({
  taskDefinitions: allTaskDefinitions,
  port,
  maxConcurrency = Number(process.env.POD_MAX_CONCURRENCY ?? 0) || Infinity,
  taskTypes = process.env.POD_TASK_TYPES?.split(',')
    .map((t) => t.trim())
    .filter(Boolean),
  kibanaVersion = POD_KIBANA_VERSION,
}: {
  taskDefinitions: Map<string, CapturedTaskDefinition>;
  port: number;
  /** Runs accepted at once; more get a 503 so Kibana retries them. Default: unlimited. */
  maxConcurrency?: number;
  /** Globs of task types this pod serves (a plugin's other types stay with Kibana). Default: all. */
  taskTypes?: string[];
  kibanaVersion?: string;
}) => {
  const inFlight = new Map<string, InFlight>();
  let draining = false;

  // Serving a subset of a plugin's task types lets one image run as several pools.
  const patterns = taskTypes?.map(globToRegExp);
  const taskDefinitions = patterns
    ? new Map([...allTaskDefinitions].filter(([type]) => matchesAny(patterns, type)))
    : allTaskDefinitions;

  const handleRun = async (body: PodRunRequest): Promise<PodRunResponse | undefined> => {
    const definition = taskDefinitions.get(body.taskType);
    if (!definition) return undefined;
    if (draining) throw new RefusedRun(503, 'pod is shutting down');
    if (inFlight.size >= maxConcurrency) throw new RefusedRun(503, 'pod is at capacity');
    if (body.kibanaVersion && body.kibanaVersion !== kibanaVersion) {
      throw new RefusedRun(
        409,
        `pod was built for Kibana ${kibanaVersion}, run is from ${body.kibanaVersion}`
      );
    }

    const abortController = new AbortController();
    // Kibana stops waiting at the task's deadline; stop the work then too.
    const deadlineMs = body.deadline ? new Date(body.deadline).getTime() - Date.now() : undefined;
    const deadlineTimer =
      deadlineMs !== undefined && Number.isFinite(deadlineMs)
        ? setTimeout(() => abortController.abort(), Math.max(deadlineMs, 0))
        : undefined;
    const customFields: Record<string, unknown>[] = [];
    // The fake request factory pulls in Core's HTTP utils (APM, gRPC, OpenTelemetry); only runs that
    // carry an API key need it, so it is a separate chunk.
    const buildTaskFakeRequest = body.apiKey
      ? (await import('../../task_running/fake_request_factory')).buildTaskFakeRequest
      : undefined;
    const fakeRequest =
      buildTaskFakeRequest && body.apiKey
        ? buildTaskFakeRequest({
            apiKey: body.apiKey,
            spaceId: body.spaceId,
            userProfileId: body.userProfileId,
            userName: body.userName,
            uiamApiKeyExternal: body.uiamApiKeyExternal,
            enrichFakeRequest: enrichPodFakeRequest,
          })
        : undefined;
    const enrichRequest =
      body.userProfileId || body.userName
        ? (request: KibanaRequest) =>
            enrichPodFakeRequest(request, {
              profileId: body.userProfileId,
              username: body.userName,
            })
        : undefined;

    const task = definition.createTaskRunner({
      taskInstance: reviveTaskInstance(body.taskInstance),
      fakeRequest,
      enrichRequest,
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
      } as PodRunResponse;
    } catch (error) {
      return {
        kind: 'thrown',
        error: serializeTaskRunError(error),
        customTaskRunEventFields: customFields.at(-1),
      } as PodRunResponse;
    } finally {
      clearTimeout(deadlineTimer);
      inFlight.delete(body.executionUuid);
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

      if (req.method === 'POST' && req.url === '/run') {
        const body = JSON.parse(await readBody(req)) as PodRunRequest;
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
  // every run the pod is serving.
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
        process.exit(0);
      }
    }, 100);
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  server.listen(port, () => {
    process.stdout.write('READY\n');
  });
  return server;
};
