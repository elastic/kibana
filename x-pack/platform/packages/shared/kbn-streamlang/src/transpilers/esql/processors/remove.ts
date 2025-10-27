/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-ast';
import type { ESQLAstCommand } from '@kbn/esql-ast';
import type { RemoveProcessor } from '../../../../types/processors';
import { buildIgnoreMissingFilter } from './common';
import { conditionToESQLAst } from '../condition_to_esql';

/**
 * Converts a Streamlang RemoveProcessor into a list of ES|QL AST commands.
 *
 * For unconditional removal (no 'where' or 'where: always'):
 *   Uses DROP command to remove the field
 *   When by_prefix is true: Uses DROP to remove both field and field.* (nested fields)
 *
 * For conditional removal (with 'where' condition):
 *   Uses EVAL with CASE to set field to null when condition matches:
 *   EVAL field = CASE(<condition>, null, field)
 *   Note: by_prefix should not be used with conditional removal
 *
 * Filters applied for Ingest Pipeline parity:
 * - When `ignore_missing: false`: `WHERE NOT(field IS NULL)` filters missing fields
 *
 * @example Unconditional:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'remove',
 *          from: 'temp_field',
 *        } as RemoveProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | DROP temp_field
 *    ```
 *
 * @example Unconditional with by_prefix:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'remove',
 *          from: 'host',
 *          by_prefix: true,
 *        } as RemoveProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | DROP host, host.*
 *    ```
 *
 * @example Conditional:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'remove',
 *          from: 'temp_field',
 *          where: { field: 'status', eq: 'test' },
 *        } as RemoveProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL temp_field = CASE(status == "test", null, temp_field)
 *    ```
 */
export function convertRemoveProcessorToESQL(processor: RemoveProcessor): ESQLAstCommand[] {
  const {
    from,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ignore_missing = false, // default: false (field must exist)
    // eslint-disable-next-line @typescript-eslint/naming-convention
    by_prefix = false, // default: false (remove only the field)
  } = processor;

  const commands: ESQLAstCommand[] = [];

  // Add missing field filter if needed (ignore_missing = false)
  // This applies to both conditional and unconditional removal
  const missingFieldFilter = buildIgnoreMissingFilter(from, ignore_missing);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  // Check if this is conditional or unconditional removal

  if ('where' in processor && processor.where && !('always' in processor.where)) {
    // Conditional removal: use EVAL with CASE to null the field when condition matches
    // EVAL field = CASE(<condition>, null, field)
    const conditionExpression = conditionToESQLAst(processor.where);

    const caseExpression = Builder.expression.func.call('CASE', [
      conditionExpression,
      Builder.expression.literal.nil(),
      Builder.expression.column(from),
    ]);

    const evalCommand = Builder.command({
      name: 'eval',
      args: [
        Builder.expression.func.binary('=', [Builder.expression.column(from), caseExpression]),
      ],
    });

    commands.push(evalCommand);
  } else {
    // Unconditional removal: use DROP command
    // When by_prefix is true, also drop all nested fields (field.*)
    // TODO: Once ESQL supports access to unmapped fields, we can make sure that "from" itself exists as well as column,
    // so we can drop <field>,<field>.* . Right now however, that would always almost fail if "from" doesn't exist, only subobject fields.
    const dropArgs = by_prefix
      ? [
          Builder.expression.column({
            args: [Builder.identifier(`${from}.`), Builder.identifier('*')],
          }),
        ]
      : [Builder.expression.column(from)];

    const dropCommand = Builder.command({
      name: 'drop',
      args: dropArgs,
    });

    commands.push(dropCommand);
  }

  return commands;
}
