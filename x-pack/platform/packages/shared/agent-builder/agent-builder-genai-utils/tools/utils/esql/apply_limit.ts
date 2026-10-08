/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, isIntegerLiteral } from '@elastic/esql';

/**
 * Applies a limit to an ES|QL query string.
 *
 * - If the last command is `LIMIT N` (integer literal), it is replaced with
 *   `LIMIT min(N, limit)`.
 * - Otherwise (including `LIMIT ?param` where the value isn't statically known),
 *   a new `| LIMIT <limit>` pipe is appended. ES|QL applies the narrower of the
 *   two at execution time.
 * - Any non-trailing `LIMIT` is left untouched.
 *
 * The rest of the query text is preserved as-is rather than re-printed, because
 * the names of unaliased columns are derived from the query text, e.g. the value
 * column of `PROMQL index=idx sum(rate(requests))`.
 *
 * If the input query has parse errors, it is returned unchanged so the caller
 * surfaces the error from Elasticsearch against the exact query they provided.
 *
 * The caller is expected to pass a positive integer `limit`; this is not
 * validated.
 */
export const applyLimit = (query: string, limit: number): string => {
  const { root, errors } = Parser.parse(query);
  if (errors.length > 0) {
    return query;
  }

  const lastCommand = root.commands[root.commands.length - 1];
  const lastArg = lastCommand?.args[0];

  if (lastCommand?.name === 'limit' && isIntegerLiteral(lastArg)) {
    const newValue = Math.min(Number(lastArg.value), limit);
    const { min, max } = lastArg.location;
    return `${query.slice(0, min)}${newValue}${query.slice(max + 1)}`;
  }

  const trimmedQuery = query.trimEnd();
  // start a new line when the query may end with a `//` line comment, which would swallow the pipe
  const separator = /\n|\/\//.test(trimmedQuery) ? '\n| ' : ' | ';
  return `${trimmedQuery}${separator}LIMIT ${limit}`;
};
