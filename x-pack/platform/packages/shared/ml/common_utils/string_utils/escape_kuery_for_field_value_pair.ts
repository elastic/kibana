/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeKuery } from '@kbn/es-query';
import { isDefined } from '@kbn/ml-is-defined';

export function escapeKueryForFieldValuePair(
  name: string,
  value: string | number | boolean | undefined
): string {
  if (!isDefined(name) || !isDefined(value)) return '';
  return `${escapeKuery(name)}:${escapeKuery(value.toString())}`;
}
