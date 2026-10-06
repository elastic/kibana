/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiTarget } from './targets';
/**
 * An API operation, addressed by the backend it belongs to and its identifier.
 */
export interface ApiReference {
  target: ApiTarget;
  api: string;
}
export declare const allApisSelector = '*';
/**
 * Every Elasticsearch operation the API tools can reach.
 */
export declare const elasticsearchApiIds: readonly string[];
/**
 * Every Kibana operation the API tools can reach.
 */
export declare const kibanaApiIds: readonly string[];
/**
 * Every value accepted where an Elasticsearch operation is granted: `*`, a namespace wildcard
 * such as `indices.*`, or an exact identifier from {@link elasticsearchApiIds}.
 */
export declare const elasticsearchApiSelectors: readonly string[];
/**
 * Every value accepted where a Kibana operation is granted: `*`, a namespace wildcard such as
 * `alerting.*`, or an exact identifier from {@link kibanaApiIds}.
 */
export declare const kibanaApiSelectors: readonly string[];
/**
 * The grantable selectors of each target, for callers building a per-target schema.
 */
export declare const apiSelectorsByTarget: Record<ApiTarget, readonly string[]>;
/**
 * Whether a reference names something grantable on its target: `*`, a namespace the target ships,
 * or one of its exact operations.
 *
 * @param reference - Target and selector to look up.
 * @returns True when the target's registry ships that selector.
 */
export declare const isKnownApiSelector: ({ target, api }: ApiReference) => boolean;
/**
 * Whether a selector stands for a set of operations rather than naming one.
 *
 * @param selector - Granted value, as passed to a pre-approval.
 * @returns True for `*` and for a namespace wildcard such as `indices.*`.
 */
export declare const isApiWildcardSelector: (selector: string) => boolean;
/**
 * Whether a granted selector covers a specific operation.
 *
 * @param selector - Granted value: `*`, a namespace wildcard such as `indices.*`, or an exact identifier.
 * @param api - Exact operation identifier, as passed to `execute_api`.
 * @returns True when the selector covers that operation.
 */
export declare const matchesApiSelector: (selector: string, api: string) => boolean;
/**
 * Filters a list of target/selector pairs down to the ones that name nothing grantable.
 *
 * @param apis - Pairs to check, in caller order.
 * @returns The unknown pairs, preserving input order. Empty when every pair is valid.
 */
export declare const findUnknownApis: <TApi extends ApiReference>(apis: readonly TApi[]) => TApi[];
/**
 * Renders unknown target/selector pairs for an error message, as `"api" (target)` entries.
 *
 * @param apis - Pairs reported by {@link findUnknownApis}.
 * @returns A comma-separated list, in the order the caller supplied them.
 */
export declare const formatUnknownApis: (apis: readonly ApiReference[]) => string;
