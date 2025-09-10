/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Builds an index name with namespace for osquery results.
 * Transforms: 'logs-osquery_manager.result*' + 'default' → 'logs-osquery_manager.result-default'
 *
 * @param indexPattern The base osquery index pattern (e.g., 'logs-osquery_manager.result*')
 * @param namespace The namespace to include (e.g., 'default')
 * @returns The index pattern with namespace (e.g., 'logs-osquery_manager.result-default')
 */
export const buildIndexNameWithNamespace = (indexPattern: string, namespace: string): string => {
  // Remove the trailing '*' and append the namespace
  // 'logs-osquery_manager.result*' → 'logs-osquery_manager.result-namespace'
  if (indexPattern.endsWith('*')) {
    return `${indexPattern.slice(0, -1)}-${namespace}`;
  }

  // If no wildcard, just append the namespace
  return `${indexPattern}-${namespace}`;
};
