/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esManifest } from '@elastic/schemas/es/tools/manifest.js';
import { kibanaManifest } from '@elastic/schemas/kibana/tools/manifest.js';
import { compact, uniq } from 'lodash';
import type { ApiTarget } from './targets';

/**
 * An API operation, addressed by the backend it belongs to and its identifier.
 */
export interface ApiReference {
  target: ApiTarget;
  api: string;
}

export const allApisSelector = '*';

const namespaceSelectorSuffix = '.*';

/**
 * Every Elasticsearch operation the API tools can reach.
 */
export const elasticsearchApiIds: readonly string[] = esManifest.map((entry) => entry.id);

/**
 * Every Kibana operation the API tools can reach.
 */
export const kibanaApiIds: readonly string[] = kibanaManifest.map((entry) => entry.id);

const toNamespace = (api: string): string | undefined => {
  const separator = api.indexOf('.');
  return separator === -1 ? undefined : api.slice(0, separator);
};

const toNamespaceSelectors = (apiIds: readonly string[]): string[] =>
  uniq(compact(apiIds.map(toNamespace)))
    .sort()
    .map((namespace) => `${namespace}${namespaceSelectorSuffix}`);

const toSelectors = (apiIds: readonly string[]): readonly string[] => [
  allApisSelector,
  ...toNamespaceSelectors(apiIds),
  ...apiIds,
];

/**
 * Every value accepted where an Elasticsearch operation is granted: `*`, a namespace wildcard
 * such as `indices.*`, or an exact identifier from {@link elasticsearchApiIds}.
 */
export const elasticsearchApiSelectors = toSelectors(elasticsearchApiIds);

/**
 * Every value accepted where a Kibana operation is granted: `*`, a namespace wildcard such as
 * `alerting.*`, or an exact identifier from {@link kibanaApiIds}.
 */
export const kibanaApiSelectors = toSelectors(kibanaApiIds);

/**
 * The grantable selectors of each target, for callers building a per-target schema.
 */
export const apiSelectorsByTarget: Record<ApiTarget, readonly string[]> = {
  elasticsearch: elasticsearchApiSelectors,
  kibana: kibanaApiSelectors,
};

const selectorSetsByTarget: Record<ApiTarget, ReadonlySet<string>> = {
  elasticsearch: new Set(elasticsearchApiSelectors),
  kibana: new Set(kibanaApiSelectors),
};

/**
 * Whether a reference names something grantable on its target: `*`, a namespace the target ships,
 * or one of its exact operations.
 *
 * @param reference - Target and selector to look up.
 * @returns True when the target's registry ships that selector.
 */
export const isKnownApiSelector = ({ target, api }: ApiReference): boolean =>
  selectorSetsByTarget[target].has(api);

/**
 * Whether a granted selector covers a specific operation.
 *
 * @param selector - Granted value: `*`, a namespace wildcard such as `indices.*`, or an exact identifier.
 * @param api - Exact operation identifier, as passed to `execute_api`.
 * @returns True when the selector covers that operation.
 */
export const matchesApiSelector = (selector: string, api: string): boolean => {
  if (selector === allApisSelector || selector === api) {
    return true;
  }
  if (!selector.endsWith(namespaceSelectorSuffix)) {
    return false;
  }
  return api.startsWith(selector.slice(0, -1));
};

/**
 * Filters a list of target/selector pairs down to the ones that name nothing grantable.
 *
 * @param apis - Pairs to check, in caller order.
 * @returns The unknown pairs, preserving input order. Empty when every pair is valid.
 */
export const findUnknownApis = <TApi extends ApiReference>(apis: readonly TApi[]): TApi[] =>
  apis.filter((entry) => !isKnownApiSelector(entry));

/**
 * Renders unknown target/selector pairs for an error message, as `"api" (target)` entries.
 *
 * @param apis - Pairs reported by {@link findUnknownApis}.
 * @returns A comma-separated list, in the order the caller supplied them.
 */
export const formatUnknownApis = (apis: readonly ApiReference[]): string =>
  apis.map(({ target, api }) => `"${api}" (${target})`).join(', ');
