/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Parser, Walker } from '@elastic/esql';

const SOURCE_COMMANDS = new Set(['from', 'ts']);
const ALLOWED_PROCESSING_COMMANDS = new Set(['where']);

/**
 * Validates that an ES|QL query is a valid Nightshift source: `FROM` or `TS` (time-series),
 * optionally narrowed by `WHERE`. Anything that reshapes rows belongs to the engines reading
 * the view. `METADATA` is rejected because ES|QL returns nulls for it through a view, and
 * remote-cluster prefixes because views cannot reference remote indices.
 *
 * Returns `undefined` when valid, or an error message string when invalid.
 * Browser-safe: does not depend on any server-only module.
 */
export const validateSourceQuery = (esql: string): string | undefined => {
  let root;
  try {
    const parsed = Parser.parse(esql);
    if (parsed.errors.length > 0) {
      return `Invalid ES|QL query: ${parsed.errors.map((e) => e.message).join('; ')}`;
    }
    root = parsed.root;
  } catch (error) {
    return `Invalid ES|QL query: ${error instanceof Error ? error.message : String(error)}`;
  }

  const [firstCommand] = root.commands;
  if (!firstCommand || !SOURCE_COMMANDS.has(firstCommand.name)) {
    return 'A source query must start with FROM or TS';
  }

  const disallowedCommand = Walker.commands(root).find(
    (command) => command !== firstCommand && !ALLOWED_PROCESSING_COMMANDS.has(command.name)
  );
  if (disallowedCommand) {
    return `Command "${disallowedCommand.name.toUpperCase()}" is not allowed in a source query: only WHERE may follow FROM or TS`;
  }

  if (Walker.matchAll(root, { type: 'option', name: 'metadata' }).length > 0) {
    return 'METADATA is not allowed in a source query';
  }

  const remoteSource = Walker.find(
    root,
    (node) => node.type === 'source' && node.sourceType === 'index' && Boolean(node.prefix)
  );
  if (remoteSource) {
    return `Remote cluster references are not allowed in a source query (found "${remoteSource.name}")`;
  }

  return undefined;
};

/**
 * The source command alone (`FROM a, b*` or `TS ...`), used to probe whether any index exists
 * behind an already validated query. Only safe to call after `validateSourceQuery` returned
 * `undefined`.
 */
export const getSourceCommandQuery = (esql: string): string => {
  const { root } = Parser.parse(esql);
  const [firstCommand] = root.commands;
  return BasicPrettyPrinter.command(firstCommand);
};
