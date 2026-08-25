/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidNamespace } from '@kbn/fleet-plugin/common';

const UNSAFE_INDEX_TARGET_CHARACTERS = /[,*:]/;

/**
 * Thrown when a namespace cannot be safely turned into an index target. Carries
 * a 400 status so route handlers surface it as a Bad Request (an invalid
 * namespace is a request/data-contract problem, not an internal error) instead
 * of masking it as a generic 500.
 */
export class InvalidNamespaceError extends Error {
  public readonly statusCode = 400;

  constructor(message = 'Invalid integration namespace') {
    super(message);
    this.name = 'InvalidNamespaceError';
  }
}

/**
 * Builds an index name with namespace for osquery results.
 * Transforms: 'logs-osquery_manager.result*' + 'default' → 'logs-osquery_manager.result-default'
 *
 * @param indexPattern The base osquery index pattern (e.g., 'logs-osquery_manager.result*')
 * @param namespace The namespace to include (e.g., 'default')
 * @returns The index pattern with namespace (e.g., 'logs-osquery_manager.result-default')
 */
export const buildIndexNameWithNamespace = (indexPattern: string, namespace: string): string => {
  if (!isValidNamespace(namespace).valid || UNSAFE_INDEX_TARGET_CHARACTERS.test(namespace)) {
    throw new InvalidNamespaceError();
  }

  // Remove the trailing '*' and append the namespace
  // 'logs-osquery_manager.result*' → 'logs-osquery_manager.result-namespace'
  if (indexPattern.endsWith('*')) {
    return `${indexPattern.slice(0, -1)}-${namespace}`;
  }

  // If no wildcard, just append the namespace
  return `${indexPattern}-${namespace}`;
};

export const buildIndexNamesWithNamespaces = (
  indexPattern: string,
  namespaces: string[] | readonly string[] | undefined
): string[] =>
  namespaces?.length
    ? namespaces.map((namespace) => buildIndexNameWithNamespace(indexPattern, namespace))
    : [indexPattern];
