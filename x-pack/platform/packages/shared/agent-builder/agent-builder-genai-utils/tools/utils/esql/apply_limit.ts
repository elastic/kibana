/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Parser,
  Builder,
  WrappingPrettyPrinter,
  isIntegerLiteral,
  type WrappingPrettyPrinterOptions,
} from '@elastic/esql';

const defaultPrintOpts: WrappingPrettyPrinterOptions = {
  wrap: 80,
  pipeTab: '',
};

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
    lastCommand.args[0] = Builder.expression.literal.integer(newValue);
  } else {
    const limitCommand = Builder.command({
      name: 'limit',
      args: [Builder.expression.literal.integer(limit)],
    });
    root.commands.push(limitCommand);
  }

  return WrappingPrettyPrinter.print(root, defaultPrintOpts);
};
