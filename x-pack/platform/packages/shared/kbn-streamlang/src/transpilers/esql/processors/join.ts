/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLAstItem, ESQLAstCommand } from '@kbn/esql-language';
import { Builder } from '@kbn/esql-language';
import type { JoinProcessor } from '../../../../types/processors';
import { conditionToESQLAst } from '../condition_to_esql';

/**
 * Wraps a field into an IS NULL check and returns an empty string if the field is null.
 * @param field - The field to wrap in a check.
 * @param elseValue - The value to return if the field is not null.
 * @returns ES|QL AST expression: CASE(field IS NULL, '', elseValue)
 */
function buildNullCheck(field: ESQLAstItem, elseValue: ESQLAstItem): ESQLAstItem {
  return Builder.expression.func.call('CASE', [
    Builder.expression.func.postfix('IS NULL', field),
    Builder.expression.literal.string(''),
    elseValue,
  ]);
}

/**
 * Converts a JoinProcessor into a list of ES|QL AST commands.
 *
 * With `where` condition:
 *   EVAL <to> = CASE(<where>, CONCAT(<field1>, <delimiter>, <field2>, <delimiter>, ...), NULL)
 *
 * With `ignore_missing: true`:
 *   EVAL <to> = CONCAT(CASE(<field1> IS NULL, "", <field1>), CASE(<field1> IS NULL, "", <delimiter>), ...)
 *
 * @example
 *   { action: 'join', from: ['field1', 'field2', 'field3'], delimiter: '-', to: 'my_joined_field' }
 *   -> EVAL my_joined_field = CONCAT(field1, '-', field2, '-', field3)
 *
 * @example
 *   { action: 'join', from: ['field1', 'field2', 'field3'], delimiter: '-', to: 'my_joined_field', where: { field: 'field1', eq: 'value' } }
 *   -> EVAL my_joined_field = CASE(field1 == "value", CONCAT(field1, '-', field2, '-', field3), NULL)
 */
export function convertJoinProcessorToESQL(processor: JoinProcessor): ESQLAstCommand[] {
  const { to, where, delimiter, from, ignore_missing = false } = processor;

  const delimiterExpression = Builder.expression.literal.string(delimiter);

  const fromColumns: ESQLAstItem[] = [];

  from.forEach((field, i) => {
    const column = Builder.expression.column(field);

    // Handle `ignore_missing: true` - omit a missing field by replacing it with an empty string
    if (ignore_missing) {
      // Wrap field in a null check before pushing it to the array
      // CASE(field IS NULL, "", field)
      const caseExpression = buildNullCheck(column, column);
      fromColumns.push(caseExpression);

      // Add delimiter if not the last field
      if (i < from.length - 1) {
        // Wrap delimiter in a null check before pushing it to the array
        // CASE(field IS NULL, "", delimiter)
        fromColumns.push(buildNullCheck(column, delimiterExpression));
      }
    } else {
      fromColumns.push(column);

      if (i < from.length - 1) {
        fromColumns.push(delimiterExpression);
      }
    }
  });

  const concatExpression = Builder.expression.func.call('CONCAT', fromColumns);

  const whereExpression = where ? conditionToESQLAst(where) : null;

  // If there's a condition, wrap in CASE(condition, expression, NULL)
  const assignment = whereExpression
    ? Builder.expression.func.call('CASE', [
        whereExpression,
        concatExpression,
        Builder.expression.literal.nil(),
      ])
    : concatExpression;

  return [
    Builder.command({
      name: 'eval',
      args: [Builder.expression.func.binary('=', [Builder.expression.column(to), assignment])],
    }),
  ];
}
