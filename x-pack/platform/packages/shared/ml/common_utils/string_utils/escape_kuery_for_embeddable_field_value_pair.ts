/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeKuery } from '@kbn/es-query';
import { isDefined } from '@kbn/ml-is-defined';

const replaceEmptyStringWithQuotation = (s: string) => (s === '' ? '""' : s);

/**
 *
 * Helper function to returns escaped combined field name and value
 * which also replaces empty str with " to ensure compatability with kql queries
 * @param name fieldName of selection
 * @param value fieldValue of selection
 * @returns {string} escaped `name:value` compatible with embeddable input
 */
export function escapeKueryForEmbeddableFieldValuePair(
  name: string,
  value: string | number | boolean | undefined
): string {
  if (!isDefined(name) || !isDefined(value)) return '';
  return `${replaceEmptyStringWithQuotation(escapeKuery(name))}:${replaceEmptyStringWithQuotation(
    escapeKuery(value.toString())
  )}`;
}
