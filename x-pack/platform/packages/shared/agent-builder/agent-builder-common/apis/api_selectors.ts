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

export const allApisSelector = '*';

const namespaceSelectorSuffix = '.*';

/**
 * The namespace an operation belongs to, read from its identifier.
 *
 * @param api - Exact operation identifier, such as `indices.delete`.
 * @returns The part before the first dot, or `undefined` for an identifier without one, such as `bulk`.
 */
export const toApiNamespace = (api: string): string | undefined => {
  const separator = api.indexOf('.');
  return separator === -1 ? undefined : api.slice(0, separator);
};

/**
 * The wildcard that grants every operation of a namespace.
 *
 * @param namespace - Namespace as returned by {@link toApiNamespace}.
 * @returns The namespace wildcard, such as `indices.*`.
 */
export const toNamespaceSelector = (namespace: string): string =>
  `${namespace}${namespaceSelectorSuffix}`;

/**
 * Whether a selector stands for a set of operations rather than naming one.
 *
 * @param selector - Granted value, as passed to a pre-approval.
 * @returns True for `*` and for a namespace wildcard such as `indices.*`.
 */
export const isApiWildcardSelector = (selector: string): boolean =>
  selector === allApisSelector || selector.endsWith(namespaceSelectorSuffix);

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
 * Whether any of a list of target/selector pairs covers a specific operation.
 *
 * @param selectors - Pairs to match against. Each selector is `*`, a namespace wildcard such as
 *   `indices.*`, or an exact identifier, and only covers operations on its own target.
 * @param reference - Target and exact operation identifier to look up.
 * @returns True when at least one pair covers the operation. False for an empty list.
 */
export const matchesAnyApiSelector = (
  selectors: readonly ApiReference[],
  { target, api }: ApiReference
): boolean =>
  selectors.some((selector) => selector.target === target && matchesApiSelector(selector.api, api));
