/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { esApiRegistry, kbApiRegistry } from '@kbn/elastic-clients-sdk';
import type { ApiRegistry, ApiRegistryMeta } from '@kbn/elastic-clients-sdk';

export type ApiTarget = 'elasticsearch' | 'kibana';

export const API_REGISTRIES: Record<ApiTarget, ApiRegistry> = {
  elasticsearch: esApiRegistry,
  kibana: kbApiRegistry,
};

export const targetSchema = z
  .enum(['elasticsearch', 'kibana'])
  .describe(
    'The backend API target. Use "elasticsearch" to call Elasticsearch HTTP APIs and "kibana" to call Kibana HTTP APIs. '
  );

/**
 * Builds the stable identifier for an API operation from its namespace and name.
 *
 * The combination of `namespace` and `name` uniquely identifies every operation in a
 * registry's manifest. Namespaced operations are rendered as `"<namespace>.<name>"`
 * (e.g. `"indices.create"`); root-level operations (with no namespace) use just the
 * name (e.g. `"bulk"`).
 */
export const apiId = (meta: Pick<ApiRegistryMeta, 'name' | 'namespace'>): string =>
  meta.namespace != null ? `${meta.namespace}.${meta.name}` : meta.name;

/** Resolves a manifest entry from its `namespace`/`name` identifier (see {@link apiId}). */
export const findApi = (registry: ApiRegistry, id: string): ApiRegistryMeta | undefined =>
  registry.manifest.find((meta) => apiId(meta) === id);
