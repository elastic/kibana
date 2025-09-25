/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conditionToESQL } from '@kbn/streamlang';
import type { StreamQuery } from '../queries';

export const buildEsqlQuery = (
  indices: string[],
  query: StreamQuery,
  includeMetadata: boolean = false
): string => {
  const metadata = includeMetadata ? ' METADATA _id, _source' : '';
  const systemFilter = query.system ? ` AND ${conditionToESQL(query.system.filter)}` : '';
  const escapedKql = query.kql.query.replace(/"/g, '\\"');
  // eslint-disable-next-line prettier/prettier
  const esqlQuery = `FROM ${indices.join(',')}${metadata} | WHERE KQL("${escapedKql}")${systemFilter}`;
  return esqlQuery;
};
