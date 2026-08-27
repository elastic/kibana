/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esManifest } from '@elastic/schemas/es/tools/manifest.js';
import { kibanaManifest } from '@elastic/schemas/kibana/tools/manifest.js';
import type { ApiTarget } from './targets';

/**
 * An API operation, addressed by the backend it belongs to and its identifier.
 */
export interface ApiReference {
  target: ApiTarget;
  api: string;
}

/**
 * Every Elasticsearch operation the API tools can reach.
 */
export const elasticsearchApiIds: readonly string[] = esManifest.map((entry) => entry.id);

/**
 * Every Kibana operation the API tools can reach. See {@link elasticsearchApiIds}.
 */
export const kibanaApiIds: readonly string[] = kibanaManifest.map((entry) => entry.id);

const apiIdsByTarget: Record<ApiTarget, ReadonlySet<string>> = {
  elasticsearch: new Set(elasticsearchApiIds),
  kibana: new Set(kibanaApiIds),
};

/**
 * Whether a reference names a real operation on its target.
 *
 * @param reference - Target and identifier to look up, as passed to `execute_api`.
 * @returns True when the target's registry ships that operation.
 */
export const isKnownApi = ({ target, api }: ApiReference): boolean =>
  apiIdsByTarget[target].has(api);

/**
 * Filters a list of target/API pairs down to the ones that name no real operation.
 *
 * @param apis - Pairs to check, in caller order.
 * @returns The unknown pairs, preserving input order. Empty when every pair is valid.
 */
export const findUnknownApis = <TApi extends ApiReference>(apis: readonly TApi[]): TApi[] =>
  apis.filter((entry) => !isKnownApi(entry));

/**
 * Renders unknown target/API pairs for an error message, as `"api" (target)` entries.
 *
 * @param apis - Pairs reported by {@link findUnknownApis}.
 * @returns A comma-separated list, in the order the caller supplied them.
 */
export const formatUnknownApis = (apis: readonly ApiReference[]): string =>
  apis.map(({ target, api }) => `"${api}" (${target})`).join(', ');
