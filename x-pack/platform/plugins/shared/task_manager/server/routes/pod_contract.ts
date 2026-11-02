/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import type { PodContractRegistry } from '../task_pod/pod_contract_registry';
import { PodContractNotFoundError } from '../task_pod/pod_contract_not_found_error';
import { serializeTaskRunError } from '../task_running/errors';
import type { PodContractCallRequest, PodContractCallResponse } from '../task_pod/wire';

const MAX_CALLBACK_BYTES = 10 * 1024 * 1024;

/**
 * Where task pods call back into Kibana for plugin contracts that are not bundled in the pod.
 * The credential is the per-run token minted by `RemoteTaskRunner`, valid only while that run is
 * in flight; only methods a plugin registered with `registerPodContract` are callable.
 */
export function podContractRoute({
  router,
  registry,
  logger,
}: {
  router: IRouter;
  registry: PodContractRegistry;
  logger: Logger;
}) {
  router.post(
    {
      path: '/internal/task_manager/pod_contract',
      security: {
        authz: {
          enabled: false,
          reason: 'Authenticated by a per-run token minted by Task Manager for an in-flight run',
        },
        authc: {
          enabled: false,
          reason: 'Authenticated by a per-run token minted by Task Manager for an in-flight run',
        },
      },
      validate: {
        body: schema.object({
          token: schema.string(),
          pluginId: schema.string(),
          method: schema.string(),
          args: schema.arrayOf(schema.any(), { defaultValue: [] }),
        }),
      },
      options: { access: 'internal', body: { maxBytes: MAX_CALLBACK_BYTES } },
    },
    async (_context, req, res) => {
      const { status, body } = await invokePodContract(registry, logger, req.body);
      return status === 404 ? res.notFound({ body }) : res.ok({ body });
    }
  );
}

/** What the route does with a call, separate from the HTTP framework so it can be tested directly. */
export async function invokePodContract(
  registry: PodContractRegistry,
  logger: Logger,
  { token, pluginId, method, args }: PodContractCallRequest
): Promise<
  { status: 200; body: PodContractCallResponse } | { status: 404; body: { message: string } }
> {
  try {
    const result = await registry.invoke(token, pluginId, method, args);
    return { status: 200, body: { result: result ?? null } };
  } catch (error) {
    if (error instanceof PodContractNotFoundError) {
      return { status: 404, body: { message: error.message } };
    }
    logger.warn(`pod contract ${pluginId}.${method} failed: ${(error as Error).message}`);
    return { status: 200, body: { error: serializeTaskRunError(error) } };
  }
}
