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

  const commands: ESQLAstCommand[] = [];
  const typeConversionFunction = resolveTypeConversionFunctionForESQL(type);
  const convertAssignment = Builder.expression.func.call(typeConversionFunction, [fromColumn]);

  // Add missing field filter if needed (ignore_missing = false)
  const missingFieldFilter = buildIgnoreMissingFilter(from, ignore_missing);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  /**
   * 1. Best case: No where condition, just convert the field.
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
   */
  if (!where) {
    const evalCommand = Builder.command({
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

  /**
   * 2. If the target field is specified and there is a where condition, use a CASE expression to conditionally set the target field to the converted value, else set it to NULL.
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
  if (to) {
    const evalCommand = Builder.command({
      name: 'eval',
      args: [
        Builder.expression.func.binary('=', [
          Builder.expression.column(to),
          Builder.expression.func.call('CASE', [
            buildWhereCondition(from, ignore_missing, where, conditionToESQLAst),
            convertAssignment,
            Builder.expression.literal.nil(),
          ]),
        ]),
      ],
    });
    commands.push(evalCommand);
    return commands;
  }

  /**
   * 3. If the target field is not specified and there is a where condition:
   *    - use a CASE expression to evaluate the where condition: if true, gives the converted value, else gives NULL.
   *    - set the evaluated value to a target field named `${from}__to_${type}`.
   *
   * THIS IS THE ONLY CASE WHERE WE NEED TO EVALUATE A NEW FIELD WHEN THE USER DOES NOT SPECIFY A TARGET FIELD.
   * IT IS BECAUSE WE, IN CASE THE CONDITION IS FALSE, WE CANNOT OVERRIDE THE SOURCE FIELD WITH SOMETHING LIKE:
   * ```txt
   * EVAL `http.status_code` = CASE(`http.error` == 404, TO_STRING(`http.status_code`), `http.status_code`)
   * ```
   * BECAUSE IT WOULD RESULT IN A CASE EXPRESSION EVALUATING TWO DIFFERENT TYPES, WHICH IS NOT ALLOWED.
   * SO WE EVALUATE THE CONDITION AND SET THE VALUE TO A NEW FIELD, ADDING A COMMENT TO INDICATE THAT WE ARE DOING THIS WHEN THE USER DOES NOT SPECIFY A TARGET FIELD.
   *
   *  @example
   *     ```typescript
   *     const streamlangDSL: StreamlangDSL = {
   *        steps: [
   *          {
   *            action: 'convert',
   *            from: 'http.status_code',
   *            type: 'string',
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
   *      // N.B. We are evaluating a new field when the user does not specify a target field to preserve type conversion logic.
   *      | EVAL http.status_code__to_string = CASE(NOT(`http.error` IS NULL), TO_STRING(http.status_code), NULL)
   *    ```
   */

  const evalCommand = Builder.command({
    name: 'eval',
    args: [
      Builder.expression.func.binary('=', [
        Builder.expression.column(`${from}__to_${type}`),
        Builder.expression.func.call('CASE', [
          buildWhereCondition(from, ignore_missing, where, conditionToESQLAst),
          convertAssignment,
          Builder.expression.literal.nil(),
        ]),
      ]),
    ],
  });

  evalCommand.formatting = {
    top: [
      Builder.comment(
        'single-line',
        'N.B. We are evaluating a new field when the user does not specify a target field to preserve type conversion logic.'
      ),
    ],
  };

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
