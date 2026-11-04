/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const PROMQL_MENTION = /promql/i;
const PROMQL_KEYWORD = 'PROMQL';

/**
 * Adds the `PROMQL` keyword to the requested documentation keywords when the request mentions PromQL.
 *
 * A request for PromQL must not depend on the model also asking for the `PROMQL` documentation, otherwise
 * it may write a `TS` query instead, or a `PROMQL` query without knowing its syntax and limitations.
 */
export const withPromqlKeyword = (
  keywords: string[],
  nlQuery: string,
  additionalContext?: string
): string[] => {
  if (keywords.includes(PROMQL_KEYWORD)) {
    return keywords;
  }
  const mentionsPromql =
    PROMQL_MENTION.test(nlQuery) || PROMQL_MENTION.test(additionalContext ?? '');
  return mentionsPromql ? [...keywords, PROMQL_KEYWORD] : keywords;
};
