/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLAstItem, ESQLAstQueryExpression, ESQLFunction } from '@elastic/esql/types';
import {
  BasicPrettyPrinter,
  Builder,
  Parser,
  isColumn,
  isFunctionExpression,
  mutate,
} from '@elastic/esql';

/**
 * Source-document metadata that identifies a rule event for deduplication.
 * Matches the detection engine's ES|QL rule type, which hashes
 * `_id`, `_version`, `_index` together with the space and rule ids.
 */
export const DEDUPLICATION_METADATA_FIELDS = ['_id', '_index', '_version'] as const;

const isAggregating = (root: ESQLAstQueryExpression): boolean =>
  root.commands.some((command) => command.name === 'stats');

/**
 * Returns the query with `METADATA _id, _index, _version` upserted into `FROM`
 * and the same fields appended to any `KEEP` that would otherwise drop them.
 *
 * Aggregating queries (any `STATS`) are returned unchanged: their rows are not
 * source documents, so there is no document identity to deduplicate on.
 *
 * KEEP injection stops at the first command that changes what the field
 * means — `DROP` of the field or a wildcard, `RENAME field AS …`, or
 * `EVAL field = …` — mirroring the detection engine's `injectMetadataId`.
 */
export const injectDeduplicationMetadata = (query: string): string => {
  const { root } = Parser.parse(query);

  if (isAggregating(root)) {
    return query;
  }

  for (const field of DEDUPLICATION_METADATA_FIELDS) {
    mutate.commands.from.metadata.upsert(root, field);
    addFieldToKeepCommands(root, field);
  }

  return BasicPrettyPrinter.print(root);
};

function addFieldToKeepCommands(root: ESQLAstQueryExpression, field: string): void {
  if (!root.commands.some((cmd) => cmd.name === 'keep')) {
    return;
  }

  for (const cmd of root.commands) {
    if (cmd.name === 'drop' && hasColumnMatching(cmd.args, field)) {
      break;
    }

    if (cmd.name === 'rename' && hasRenameOf(cmd.args, field)) {
      break;
    }

    if (cmd.name === 'eval' && hasAssignmentTo(cmd.args, field)) {
      break;
    }

    if (cmd.name === 'keep' && !cmd.args.some((arg) => isColumn(arg) && arg.name === field)) {
      cmd.args.push(Builder.expression.column(field));
    }
  }
}

function isTargetingColumn(arg: ESQLAstItem, columnName: string): arg is ESQLFunction {
  return isFunctionExpression(arg) && isColumn(arg.args[0]) && arg.args[0].name === columnName;
}

function hasRenameOf(args: ESQLAstItem[], field: string): boolean {
  return args.some(
    (arg) => isTargetingColumn(arg, field) && (arg.name === 'as' || arg.name === '=')
  );
}

function hasAssignmentTo(args: ESQLAstItem[], field: string): boolean {
  return args.some((arg) => isTargetingColumn(arg, field) && arg.name === '=');
}

function hasColumnMatching(args: readonly ESQLAstItem[], field: string): boolean {
  return args.some((arg) => isColumn(arg) && (arg.name === field || arg.name.includes('*')));
}
