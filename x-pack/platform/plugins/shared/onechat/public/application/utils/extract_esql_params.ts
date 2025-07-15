/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const PARAM_REGEX = /(?<!\S)\?(\w+)/g;

/**
 * Extracts all regex matches for ES|QL parameters from a query string.
 * Parameters are identified by a '?' prefix, e.g., ?my_param.
 *
 * @param esql The ES|QL query string.
 * @returns An array of RegExpMatchArray objects for each parameter found.
 */
export const extractEsqlParamMatches = (esql: string): RegExpMatchArray[] =>
  Array.from(esql.matchAll(PARAM_REGEX));

/**
 * Extracts the names of all unique parameters from an ES|QL query string.
 *
 * @param esql The ES|QL query string.
 * @returns An array of unique parameter names found in the query.
 */
export const extractEsqlParams = (esql: string): string[] => {
  const paramsArray = extractEsqlParamMatches(esql).map((match) => match[1]);
  // Remove duplicates
  return [...new Set(paramsArray)];
};
