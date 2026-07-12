/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { Observable } from 'rxjs';
import type { ServerSentEvent } from '@kbn/sse-utils';
import { observableIntoEventSourceStream } from '@kbn/sse-utils-server';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import { internalApiPath } from '../../../common/constants';
import { apiPrivileges } from '../../../common/features';
import { getSSEResponseHeaders } from '../utils';
import {
  getOpencodeSubagentExecutor,
  getOpencodeRunClient,
} from '../../services/execution/opencode_subagent';

const READ_SECURITY = {
  authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
};

/**
 * Routes powering the "Sandbox executions" inspector.
 *
 * Runs are persisted (keyed by conversation) so the flyout can show a run's full
 * activity timeline even after the sandbox pod is torn down, and can stream a
 * running pod's activity live. Also exposes cluster metadata and (PoC) an
 * arbitrary exec into a running pod.
 */
export function registerInternalSandboxRoutes({ router, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // ---- Cluster / context metadata ---------------------------------------
  router.get(
    {
      path: `${internalApiPath}/sandboxes/metadata`,
      security: READ_SECURITY,
      options: { access: 'internal' },
      validate: false,
    },
    wrapHandler(async (ctx, request, response) => {
      const executor = getOpencodeSubagentExecutor();
      if (!executor) {
        return response.ok({ body: { enabled: false } });
      }
      const metadata = await executor.getClusterMetadata();
      return response.ok({ body: { enabled: true, metadata } });
    })
  );

  // ---- Live sandbox pods -------------------------------------------------
  router.get(
    {
      path: `${internalApiPath}/sandboxes/pods`,
      security: READ_SECURITY,
      options: { access: 'internal' },
      validate: false,
    },
    wrapHandler(async (ctx, request, response) => {
      const executor = getOpencodeSubagentExecutor();
      const pods = executor ? await executor.listPods() : [];
      return response.ok({ body: { pods, enabled: Boolean(executor) } });
    })
  );

  // ---- Persisted runs for a conversation --------------------------------
  router.get(
    {
      path: `${internalApiPath}/conversations/{conversation_id}/opencode_runs`,
      security: READ_SECURITY,
      options: { access: 'internal' },
      validate: {
        params: schema.object({ conversation_id: schema.string() }),
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const runClient = getOpencodeRunClient();
      if (!runClient) {
        return response.ok({ body: { runs: [], enabled: false } });
      }
      const spaceId = (await ctx.agentBuilder).spaces.getSpaceId();
      const runs = await runClient.listByConversation(request.params.conversation_id, { spaceId });
      return response.ok({ body: { runs, enabled: true } });
    })
  );

  // ---- One run (full timeline) ------------------------------------------
  router.get(
    {
      path: `${internalApiPath}/opencode_runs/{run_id}`,
      security: READ_SECURITY,
      options: { access: 'internal' },
      validate: {
        params: schema.object({ run_id: schema.string() }),
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const runClient = getOpencodeRunClient();
      const run = runClient ? await runClient.get(request.params.run_id) : undefined;
      if (!run) {
        return response.notFound({ body: { message: 'Run not found' } });
      }
      return response.ok({ body: { run } });
    })
  );

  // ---- Live run activity (SSE, polls the persisted timeline) ------------
  router.get(
    {
      path: `${internalApiPath}/opencode_runs/{run_id}/live`,
      security: READ_SECURITY,
      options: { access: 'internal' },
      validate: {
        params: schema.object({ run_id: schema.string() }),
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const runClient = getOpencodeRunClient();
      if (!runClient) {
        return response.notFound({ body: { message: 'OpenCode sub-agent is not enabled' } });
      }
      const { run_id: runId } = request.params;

      const abortController = new AbortController();
      request.events.aborted$.subscribe(() => abortController.abort());

      const events$ = new Observable<ServerSentEvent>((subscriber) => {
        let stopped = false;
        const poll = async () => {
          try {
            const run = await runClient.get(runId);
            if (run) {
              subscriber.next({
                type: 'run',
                status: run.status,
                timeline: run.timeline,
              } as unknown as ServerSentEvent);
              if (run.status !== 'running') {
                stopped = true;
                subscriber.complete();
                return;
              }
            }
          } catch (e) {
            logger.debug(`opencode run live poll failed: ${(e as Error).message}`);
          }
          if (!stopped && !abortController.signal.aborted) {
            timer = setTimeout(poll, 1500);
          }
        };
        let timer: ReturnType<typeof setTimeout> = setTimeout(poll, 0);
        const stop = () => {
          stopped = true;
          clearTimeout(timer);
        };
        abortController.signal.addEventListener('abort', stop, { once: true });
        return () => {
          abortController.signal.removeEventListener('abort', stop);
          stop();
        };
      });

      return response.ok({
        headers: getSSEResponseHeaders(),
        body: observableIntoEventSourceStream(events$, {
          signal: abortController.signal,
          logger,
        }),
      });
    })
  );

  // ---- Exec an arbitrary command inside a running pod (PoC) --------------
  router.post(
    {
      path: `${internalApiPath}/sandboxes/{pod_name}/exec`,
      security: READ_SECURITY,
      options: { access: 'internal' },
      validate: {
        params: schema.object({ pod_name: schema.string() }),
        body: schema.object({
          command: schema.string({ minLength: 1, maxLength: 8000 }),
        }),
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const executor = getOpencodeSubagentExecutor();
      if (!executor) {
        return response.notFound({ body: { message: 'OpenCode sub-agent is not enabled' } });
      }
      const result = await executor.execCommand(request.params.pod_name, request.body.command);
      return response.ok({ body: result });
    })
  );
}
