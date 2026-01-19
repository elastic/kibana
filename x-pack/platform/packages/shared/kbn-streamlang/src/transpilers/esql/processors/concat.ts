/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder, type ESQLAstItem, type ESQLAstCommand } from '@kbn/esql-language';
import type { ConcatProcessor } from '../../../../types/processors';
import { conditionToESQLAst } from '../condition_to_esql';
import { combineOr } from './common';

/** *
 * Converts a Streamlang concat processor to ESQL.
 *
 * @example
 * Input:
 * {
 *   action: 'concat',
 *   from: [
 *     { type: 'field', value: 'first_name' },
 *     { type: 'literal', value: ' ' },
 *     { type: 'field', value: 'last_name' },
 *   ],
 *   to: 'full_name',
 * }
 *
 * Output (ignore_missing = false):
 * | EVAL full_name = CASE(first_name IS NULL OR last_name IS NULL, null, CONCAT(first_name, " ", last_name))
 *
 * Output (ignore_missing = true):
 * | EVAL full_name = CONCAT(COALESCE(first_name, ""), " ", COALESCE(last_name, ""))
 */
export const convertConcatProcessorToESQL = (processor: ConcatProcessor): ESQLAstCommand[] => {
  const { to, from, where, ignore_missing = false } = processor;

  const commands: ESQLAstCommand[] = [];

  // Get field references (only fields, not literals)
  const fieldRefs = from.filter((item) => item.type === 'field');

  // Build the from values with appropriate null handling
  const fromValues = from.map((item) => {
    if (item.type === 'field') {
      const column = Builder.expression.column(item.value);
      if (ignore_missing) {
        // If ignore_missing is true, use COALESCE to default missing fields to empty string
        return Builder.expression.func.call('COALESCE', [
          column,
          Builder.expression.literal.string(''),
        ]);
      }
      return column;
    }
    return Builder.expression.literal.string(item.value);
  });

  const toColumn = Builder.expression.column(to);
  const concatFunction = Builder.expression.func.call('CONCAT', fromValues);

  // Build the final expression based on ignore_missing
  let finalExpression: ESQLAstItem;

  if (!ignore_missing && fieldRefs.length > 0) {
    // If ignore_missing is false, check if any field is null
    // If any field is null, return null; otherwise return the concat
    const nullChecks = fieldRefs.map((item) =>
      Builder.expression.func.postfix('IS NULL', Builder.expression.column(item.value))
    );

    // Combine with OR: field1 IS NULL OR field2 IS NULL OR ...
    const anyNullCondition = combineOr(nullChecks)!;

    // CASE(anyNullCondition, null, CONCAT(...))
    finalExpression = Builder.expression.func.call('CASE', [
      anyNullCondition,
      Builder.expression.literal.nil(),
      concatFunction,
    ]);
  } else {
    // ignore_missing is true, or there are no fields - just use the concat directly
    finalExpression = concatFunction;
  }

  if (where && !('always' in where)) {
    // conditional concat: use CASE to conditionally set the target field
    const conditionExpression = conditionToESQLAst(where);
    const caseExpression = Builder.expression.func.call('CASE', [
      conditionExpression,
      finalExpression,
      Builder.expression.literal.nil(),
    ]);
    const evalCommand = Builder.command({
      name: 'eval',
      args: [Builder.expression.func.binary('=', [toColumn, caseExpression])],
    });
    commands.push(evalCommand);
  } else {
    // always set to the final expression
    const evalCommand = Builder.command({
      name: 'eval',
      args: [Builder.expression.func.binary('=', [toColumn, finalExpression])],
    });
    commands.push(evalCommand);
  }
  return commands;
};
