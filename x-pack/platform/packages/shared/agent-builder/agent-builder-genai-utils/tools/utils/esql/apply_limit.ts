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
  type WrappingPrettyPrinterOptions,
} from '@elastic/esql';
import type { ESQLLiteral } from '@elastic/esql/types';

const defaultPrintOpts: WrappingPrettyPrinterOptions = {
  wrap: 80,
  pipeTab: '',
};

/**
 * Applies a limit to an ES|QL query string.
 *
 * - If the last command of the query is a `LIMIT N`, it is replaced with
 *   `LIMIT min(N, limit)`.
 * - Otherwise, a new `| LIMIT <limit>` pipe is appended.
 * - Any non-trailing `LIMIT` is left untouched.
 *
 * The caller is expected to pass a positive integer `limit`; this is not
 * validated.
 */
export const applyLimit = (query: string, limit: number): string => {
  const { root } = Parser.parse(query);
  const lastCommand = root.commands[root.commands.length - 1];

  if (lastCommand?.name === 'limit') {
    const literal = lastCommand.args[0] as ESQLLiteral;
    const existing = Number(literal.value);
    const newValue = Number.isFinite(existing) ? Math.min(existing, limit) : limit;
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
