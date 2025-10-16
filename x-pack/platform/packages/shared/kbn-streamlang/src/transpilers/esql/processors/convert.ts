/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { Builder } from '@kbn/esql-ast';
import type { ESQLAstCommand } from '@kbn/esql-ast';
import type { ConvertType } from '../../../../types/formats';
import type { ConvertProcessor } from '../../../../types/processors';
import { conditionToESQLAst } from '../condition_to_esql';
import { buildIgnoreMissingFilter, buildWhereCondition } from './common';

/**
 * Converts a Streamlang ConvertProcessor into a list of ES|QL AST commands.
 *
 * Filters applied for Ingest Pipeline parity:
 * - When `ignore_missing: false`: `WHERE NOT(source_field IS NULL)` filters missing source fields
 *
 * Ingest Pipeline throws errors ("field doesn't exist"),
 * while ES|QL uses filtering to exclude such documents entirely.
 *
 * @example:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'convert',
 *          from: 'http.status_code',
 *          type: 'string',
 *          ignore_missing: true,
 *          where: { field: 'http.error', exists: true },
 *        } as ConvertProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates (conceptually):
 *    ```txt
 *    // | WHERE NOT(size IS NULL)  // Only if ignore_missing = false
 *    | EVAL size = CASE(NOT(`http.error` IS NULL), TO_STRING(size), size)
 *    ```
 */
export function convertConvertProcessorToESQL(processor: ConvertProcessor): ESQLAstCommand[] {
  const {
    from,
    to,
    type,
    ignore_missing = false, // default same as Convert Ingest Processor
    where,
  } = processor;
  const fromColumn = Builder.expression.column(from);
  // If the target field is not specified, replace the source field
  const toColumn = Builder.expression.column(to ?? from);

  const commands: ESQLAstCommand[] = [];

  // Add missing field filter if needed (ignore_missing = false)
  const missingFieldFilter = buildIgnoreMissingFilter(from, ignore_missing);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  const typeConversionFunction = resolveTypeConversionFunctionForESQL(type);

  let convertAssignment = Builder.expression.func.call(typeConversionFunction, [fromColumn]);

  if (where) {
    convertAssignment = Builder.expression.func.call('CASE', [
      buildWhereCondition(from, ignore_missing, where, conditionToESQLAst),
      convertAssignment,
      to ? Builder.expression.literal.nil() : fromColumn,
    ]);
  }

  const evalCommand = Builder.command({
    name: 'eval',
    args: [Builder.expression.func.binary('=', [toColumn, convertAssignment])],
  });

  commands.push(evalCommand);

  return commands;
}

function resolveTypeConversionFunctionForESQL(type: ConvertType): string {
  switch (type) {
    case 'integer':
      return 'TO_INTEGER';
    case 'long':
      return 'TO_LONG';
    case 'double':
      return 'TO_DOUBLE';
    case 'boolean':
      return 'TO_BOOLEAN';
    case 'string':
      return 'TO_STRING';
    default:
      throw new Error(`Unsupported Streamlang DSL conversion type: ${type}`);
  }
}
