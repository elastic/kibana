/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-language';
import type { ESQLAstCommand } from '@kbn/esql-language';
import { isAlwaysCondition } from '../../../..';
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
 *          to: 'http.status_code_str',
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
 *    | EVAL http.status_code_str = CASE(NOT(`http.error` IS NULL), TO_STRING(http.status_code), null)
 *    ```
 */
export function convertConvertProcessorToESQL(processor: ConvertProcessor): ESQLAstCommand[] {
  const {
    from,
    to,
    type,
    ignore_missing = false, // default same as Convert Ingest Processor
  } = processor;
  const fromColumn = Builder.expression.column(from);

  const commands: ESQLAstCommand[] = [];
  const typeConversionFunction = resolveTypeConversionFunctionForESQL(type);
  const convertAssignment = Builder.expression.func.call(typeConversionFunction, [fromColumn]);

  // Add missing field filter if needed (ignore_missing = false)
  const missingFieldFilter = buildIgnoreMissingFilter(from, ignore_missing);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  /**
   * 1. If there is a where condition, we force the user to specify a target field, hence use a CASE expression to conditionally set the target field to the converted value, else set it to NULL.
   *
   *  @example
   *     ```typescript
   *     const streamlangDSL: StreamlangDSL = {
   *        steps: [
   *          {
   *            action: 'convert',
   *            from: 'http.status_code',
   *            type: 'string',
   *            to: 'http.status_code_str',
   *            where: {
   *              field: 'http.error',
   *              exists: true,
   *            },
   *          },
   *        ],
   *      };
   *    ```
   * Generates (conceptually):
   *    ```txt
   *      // | WHERE NOT(http.status_code IS NULL)  // Only if ignore_missing = false
   *      | EVAL http.status_code_str = CASE(NOT(`http.error` IS NULL), TO_STRING(http.status_code), NULL)
   *    ```
   */

  if ('where' in processor && processor.where && !isAlwaysCondition(processor.where)) {
    const evalCommandWithCondition = Builder.command({
      name: 'eval',
      args: [
        Builder.expression.func.binary('=', [
          Builder.expression.column(processor.to!), // Safe because refinement ensures 'to' exists when 'where' is present
          Builder.expression.func.call('CASE', [
            buildWhereCondition(from, ignore_missing, processor.where, conditionToESQLAst),
            convertAssignment,
            Builder.expression.literal.nil(),
          ]),
        ]),
      ],
    });
    commands.push(evalCommandWithCondition);
    return commands;
  }
  /**
   * 2. Default case: No where condition, just convert the field.
   *
   *  @example
   *     ```typescript
   *     const streamlangDSL: StreamlangDSL = {
   *        steps: [
   *          {
   *            action: 'convert',
   *            from: 'http.status_code',
   *            to: 'http.status_code_str',
   *            type: 'string',
   *          },
   *        ],
   *      };
   *    ```
   * Generates (conceptually):
   *    ```txt
   *      // | WHERE NOT(http.status_code IS NULL)  // Only if ignore_missing = false
   *      | EVAL http.status_code_str = TO_STRING(http.status_code)
   *    ```
   */ const evalCommand = Builder.command({
    name: 'eval',
    args: [
      Builder.expression.func.binary('=', [
        Builder.expression.column(to ?? from), // Either the target field or override the source field
        convertAssignment,
      ]),
    ],
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
