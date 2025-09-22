/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@kbn/esql-ast';
import { esql } from '@kbn/esql-ast';
import { conditionToESQL } from '@kbn/streamlang';
import type { StreamQuery } from '../queries';

export const buildEsqlQuery = (
  indices: string[],
  query: StreamQuery,
  includeMetadata: boolean = false
): string => {
  let esqlQuery: ComposerQuery;
  if (includeMetadata) {
    // eslint-disable-next-line prettier/prettier
    esqlQuery = esql`FROM ${indices.join(',')} METADATA _id, _source | WHERE ${esql.exp(conditionToESQL(query.system.filter))} AND KQL(${query.kql.query})`;
  } else {
    // eslint-disable-next-line prettier/prettier
    esqlQuery = esql`FROM ${indices.join(',')} | WHERE ${esql.exp(conditionToESQL(query.system.filter))} AND KQL(${query.kql.query})`;
  }
  const prettyQuery = esqlQuery.print('basic');

  const cleanedQuery = prettyQuery.replace(
    /(FROM )"([^"]+)"(\s*)/, // Match any character expect a quote to avoid eating the closing quote
    (_, from, target, space) => `${from}${target}${space}`
  );
  return cleanedQuery;
};
