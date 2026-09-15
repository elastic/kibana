/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Parser, Walker } from '@elastic/esql';
import type { ESQLAstQueryExpression, ESQLSource } from '@elastic/esql/types';
import { badRequest } from '@hapi/boom';

const SOURCE_COMMANDS = new Set(['from', 'ts']);
const ALLOWED_PROCESSING_COMMANDS = new Set(['where']);

const parseOrThrow = (esql: string): ESQLAstQueryExpression => {
  let parsed: ReturnType<typeof Parser.parse>;
  try {
    parsed = Parser.parse(esql);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw badRequest(`Invalid ES|QL query: ${message}`);
  }
  // `Parser.parse` reports syntax errors in `errors` instead of throwing. Fail closed: a view
  // built from an unparseable query would break every consumer at query time.
  if (parsed.errors.length > 0) {
    throw badRequest(
      `Invalid ES|QL query: ${parsed.errors.map((error) => error.message).join('; ')}`
    );
  }
  return parsed.root;
};

/**
 * A source is rows only: `FROM` or `TS`, optionally narrowed by `WHERE`. Anything that reshapes
 * rows (`STATS`, `EVAL`, `KEEP`, `LIMIT`, ...) belongs to the engines reading the view, not to
 * the view itself. `METADATA` is rejected because ES|QL returns nulls for it outside a view,
 * and remote-cluster prefixes because views cannot reference remote indices.
 */
export const validateSourceQuery = (esql: string): void => {
  const root = parseOrThrow(esql);

  const [firstCommand] = root.commands;
  if (!firstCommand || !SOURCE_COMMANDS.has(firstCommand.name)) {
    throw badRequest('A source query must start with FROM or TS');
  }

  // `Walker.commands` also returns commands nested in subqueries, so `WHERE x IN (FROM ...)`
  // is rejected by the same rule as a top-level STATS.
  const disallowedCommand = Walker.commands(root).find(
    (command) => command !== firstCommand && !ALLOWED_PROCESSING_COMMANDS.has(command.name)
  );
  if (disallowedCommand) {
    throw badRequest(
      `Command "${disallowedCommand.name.toUpperCase()}" is not allowed in a source query: only WHERE may follow FROM or TS`
    );
  }

  if (Walker.matchAll(root, { type: 'option', name: 'metadata' }).length > 0) {
    throw badRequest('METADATA is not allowed in a source query');
  }

  const remoteSource = Walker.matchAll(root, { type: 'source', sourceType: 'index' }).find(
    (source) => Boolean((source as ESQLSource).prefix)
  );
  if (remoteSource) {
    throw badRequest(
      `Remote cluster references are not allowed in a source query (found "${remoteSource.name}")`
    );
  }
};

/**
 * The source command alone (`FROM a, b*` or `TS ...`), used to probe whether any index exists
 * behind an already validated query.
 */
export const getSourceCommandQuery = (esql: string): string => {
  const { root } = Parser.parse(esql);
  const [firstCommand] = root.commands;
  return BasicPrettyPrinter.command(firstCommand);
};
