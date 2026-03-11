/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Builder, Parser } from '@elastic/esql';
import type { ESQLCommand, ESQLSingleAstItem, ESQLSource } from '@elastic/esql/types';

// ---------------------------------------------------------------------------
// Internal helpers — shared parsing, type-guarding, and printing logic
// ---------------------------------------------------------------------------

function parseFromCommand(esql: string) {
  const { root } = Parser.parse(esql);
  const fromCmd = root.commands.find(
    (cmd): cmd is ESQLCommand => 'name' in cmd && cmd.name === 'from'
  );
  return { root, fromCmd };
}

function isIndexSource(arg: ESQLCommand['args'][number]): arg is ESQLSource {
  return (
    !Array.isArray(arg) &&
    'type' in arg &&
    arg.type === 'source' &&
    (arg as ESQLSource).sourceType === 'index'
  );
}

function printWithUpdatedFrom(
  root: ReturnType<typeof parseFromCommand>['root'],
  fromCmd: ESQLCommand,
  newArgs: ESQLCommand['args']
): string {
  const updatedCommands = root.commands.map((cmd) =>
    cmd === fromCmd ? { ...cmd, args: newArgs } : cmd
  );
  return BasicPrettyPrinter.print(Builder.expression.query(updatedCommands as ESQLCommand[]));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Builds the ES|QL AST node for `METADATA _id, _source`.
 * Shared across all locations that construct or augment FROM commands.
 */
export function buildMetadataOption() {
  return Builder.option({
    name: 'METADATA',
    args: [
      Builder.expression.column({ args: [Builder.identifier({ name: '_id' })] }),
      Builder.expression.column({ args: [Builder.identifier('_source')] }),
    ],
  });
}

/**
 * Parses the given ES|QL query string and returns the first argument of
 * the WHERE command as an AST node, or `undefined` when no WHERE clause
 * is present (or the argument is an unexpected array).
 */
export function extractWhereExpression(esql: string): ESQLSingleAstItem | undefined {
  const { root } = Parser.parse(esql);
  const whereCmd = root.commands.find(
    (cmd): cmd is ESQLCommand => 'name' in cmd && cmd.name === 'where'
  );
  const expr = whereCmd?.args[0];
  if (!expr || Array.isArray(expr)) return undefined;
  return expr as ESQLSingleAstItem;
}

/**
 * Ensures the ES|QL query contains `METADATA _id, _source` in its FROM
 * clause. Returns the query unchanged if METADATA is already present.
 */
export function ensureMetadata(esql: string): string {
  const { root, fromCmd } = parseFromCommand(esql);
  if (!fromCmd) return esql;

  const hasMetadata = fromCmd.args.some(
    (arg) =>
      !Array.isArray(arg) &&
      'type' in arg &&
      arg.type === 'option' &&
      'name' in arg &&
      arg.name === 'metadata'
  );

  if (hasMetadata) return esql;

  return printWithUpdatedFrom(root, fromCmd, [...fromCmd.args, buildMetadataOption()]);
}

/**
 * Normalizes an ES|QL query string by parsing it into an AST and
 * pretty-printing it back. This strips comments, collapses whitespace,
 * and uppercases command/keyword names so that two syntactically
 * equivalent queries produce the same string.
 */
export function normalizeEsqlQuery(esql: string): string {
  const { root } = Parser.parse(esql);
  return BasicPrettyPrinter.print(root);
}

/**
 * Returns the list of index source names from the FROM clause of an
 * ES|QL query. Returns an empty array when there is no FROM clause.
 */
export function getFromSources(esql: string): string[] {
  const { fromCmd } = parseFromCommand(esql);
  if (!fromCmd) return [];
  return fromCmd.args.filter(isIndexSource).map((source) => source.name);
}

/**
 * Replaces all index sources in the FROM clause with `newSources`,
 * preserving any non-source arguments (e.g. METADATA options).
 * Returns the query unchanged when there is no FROM clause.
 */
export function replaceFromSources(esql: string, newSources: string[]): string {
  const { root, fromCmd } = parseFromCommand(esql);
  if (!fromCmd) return esql;

  const nonSourceArgs = fromCmd.args.filter((arg) => !isIndexSource(arg));
  const sourceArgs = newSources.map((s) => Builder.expression.source.index(s));
  return printWithUpdatedFrom(root, fromCmd, [...sourceArgs, ...nonSourceArgs]);
}

/**
 * Rewrites the index sources in the FROM clause of an ES|QL query.
 * Each index source name is passed through `transform`; if the
 * returned value differs the source is replaced. Returns the original
 * string unchanged when there is no FROM clause or no source was
 * modified.
 */
export function rewriteFromSources(esql: string, transform: (index: string) => string): string {
  const { root, fromCmd } = parseFromCommand(esql);
  if (!fromCmd) return esql;

  let modified = false;
  const updatedArgs = fromCmd.args.map((arg) => {
    if (isIndexSource(arg)) {
      const newIndex = transform(arg.name);
      if (newIndex !== arg.name) {
        modified = true;
        return Builder.expression.source.index(newIndex);
      }
    }
    return arg;
  });

  if (!modified) return esql;

  return printWithUpdatedFrom(root, fromCmd, updatedArgs);
}
