/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-ast';
import type { ESQLAstCommand } from '@kbn/esql-ast';
import type { RenameProcessor } from '../../../../types/processors';
import { conditionToESQLAst } from '../condition_to_esql';
import { buildIgnoreMissingFilter, buildOverrideFilter } from './common';

/**
 * Converts a Streamlang RenameProcessor into a list of ES|QL AST commands.
 *
 * Filters applied for Ingest Pipeline parity:
 * - When `ignore_missing: false`: `WHERE NOT(source_field IS NULL)` filters missing source fields
 * - When `override: false`: `WHERE target_field IS NULL` filters existing target fields
 *
 * Ingest Pipeline throws errors ("field doesn't exist" / "field already exists"),
 * while ES|QL uses filtering to exclude such documents entirely.
 */
export function convertRenameProcessorToESQL(processor: RenameProcessor): ESQLAstCommand[] {
  const {
    from,
    to, // eslint-disable-next-line @typescript-eslint/naming-convention
    ignore_missing = false, // default same as Rename Ingest Processor
    override = false, // default same as Rename Ingest Processor
    where,
  } = processor as RenameProcessor;
  const fromColumn = Builder.expression.column(from);
  const toColumn = Builder.expression.column(to);

  const commands: ESQLAstCommand[] = [];

  // Add missing field filter if needed (ignore_missing = false)
  const missingFieldFilter = buildIgnoreMissingFilter(from, ignore_missing);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  // Add override filter if needed (override = false)
  const overrideFilter = buildOverrideFilter(to, override);
  if (overrideFilter) {
    commands.push(overrideFilter);
  }

  // Use the simple RENAME command only for the most basic case (no ignore_missing, no where, and override is true).
  if (!ignore_missing && override && !where) {
    commands.push(
      Builder.command({
        name: 'rename',
        args: [Builder.expression.func.binary('as', [fromColumn, toColumn])],
      })
    );
    return commands;
  }

  const conditions = [];

  // ignore_missing and override conditions are handled by WHERE to filter out documents
  // this is to be consistent with Ingest Pipeline behavior where such documents are skipped/errored out
  // Processor's `if` condition is handled here as part of the CASE expression below

  if (where) {
    conditions.push(conditionToESQLAst(where));
  }

  const finalCondition =
    conditions.length > 1
      ? conditions.reduce((acc, cond) => Builder.expression.func.binary('and', [acc, cond]))
      : conditions[0];

  const assignment = finalCondition
    ? Builder.expression.func.call('CASE', [finalCondition, fromColumn, toColumn])
    : fromColumn;

  const evalCommand = Builder.command({
    name: 'eval',
    args: [Builder.expression.func.binary('=', [toColumn, assignment])],
  });

  const dropCommand = Builder.command({ name: 'drop', args: [fromColumn] });

  commands.push(evalCommand, dropCommand);
  return commands;
}
