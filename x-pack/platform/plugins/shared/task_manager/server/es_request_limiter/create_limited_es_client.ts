/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  IClusterClient,
  IScopedClusterClient,
  KibanaRequest,
} from '@kbn/core/server';
import { getCategoryForMethod } from './es_request_categories';
import type { EsRequestLimiter } from './es_request_limiter';
import { resolveEsRequestScope } from './es_request_scopes';
import { EsRequestLimitReachedError } from './errors';

interface CreateLimitedEsClientOpts {
  client: ElasticsearchClient;
  limiter: EsRequestLimiter;
  taskType: string;
}

/**
 * Wraps an Elasticsearch client so that metered methods (see
 * `es_request_categories`) pass through the {@link EsRequestLimiter} before
 * executing. The task type's scope (resolved from the hardcoded membership map)
 * is passed to the limiter so a configured per-scope sub-budget is enforced on
 * top of the category budget. When a budget is exhausted the call rejects with
 * {@link EsRequestLimitReachedError} instead of hitting Elasticsearch.
 * Non-metered properties pass through unchanged.
 */
export const createLimitedEsClient = ({
  client,
  limiter,
  taskType,
}: CreateLimitedEsClientOpts): ElasticsearchClient => {
  const scope = resolveEsRequestScope(taskType);
  const acquireOptions = { taskType, scope };

  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      if (typeof prop !== 'string' || typeof value !== 'function') {
        return value;
      }

      const category = getCategoryForMethod(prop);
      if (!category) {
        // Preserve `this` binding for non-metered client methods.
        return value.bind(target);
      }

      const originalMethod = value as (...args: unknown[]) => unknown;

      return async (...args: unknown[]) => {
        if (!limiter.tryAcquire(category, acquireOptions)) {
          throw new EsRequestLimitReachedError(category, taskType);
        }
        try {
          return await originalMethod.apply(target, args);
        } finally {
          limiter.release(category, acquireOptions);
        }
      };
    },
  }) as unknown as ElasticsearchClient;
};

/**
 * A client accessor that throws on use. Returned for `asCurrentUser` /
 * `asSecondaryAuthUser` when a task was scheduled without an API key, so those
 * credentials-scoped clients are unavailable while `asInternalUser` still works.
 */
const createUnavailableClient = (taskType: string): ElasticsearchClient => {
  const message =
    `The credentials-scoped Elasticsearch client is not available for task "${taskType}" ` +
    `because it was scheduled without an API key. Use "asInternalUser" or schedule the task with a request.`;
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop === 'symbol') {
          return undefined;
        }
        throw new Error(message);
      },
    }
  ) as unknown as ElasticsearchClient;
};

interface BuildTaskEsClientOpts {
  clusterClient: IClusterClient;
  fakeRequest?: KibanaRequest;
  limiter: EsRequestLimiter;
  taskType: string;
}

/**
 * Builds the {@link IScopedClusterClient} exposed to a running task via
 * `RunContext.esClient`. Every accessor is wrapped with the request limiter.
 *
 * - `asInternalUser` is always available (Kibana system user).
 * - `asCurrentUser` / `asSecondaryAuthUser` are scoped to the task's API key when
 *   one exists; otherwise they throw on use.
 */
export const buildTaskEsClient = ({
  clusterClient,
  fakeRequest,
  limiter,
  taskType,
}: BuildTaskEsClientOpts): IScopedClusterClient => {
  const wrap = (client: ElasticsearchClient) =>
    createLimitedEsClient({ client, limiter, taskType });

  const asInternalUser = wrap(clusterClient.asInternalUser);

  if (!fakeRequest) {
    const unavailable = createUnavailableClient(taskType);
    return {
      asInternalUser,
      asCurrentUser: unavailable,
      asSecondaryAuthUser: unavailable,
    };
  }

  const scoped = clusterClient.asScoped(fakeRequest);
  return {
    asInternalUser,
    asCurrentUser: wrap(scoped.asCurrentUser),
    asSecondaryAuthUser: wrap(scoped.asSecondaryAuthUser),
  };
};
