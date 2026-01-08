/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder, type ESQLAstCommand } from '@kbn/esql-language';
import type { ConcatProcessor } from '../../../../types/processors';
import { conditionToESQLAst } from '../condition_to_esql';

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
 * Output:
 * | EVAL full_name = CONCAT(first_name, " ", last_name)
 */
export const convertConcatProcessorToESQL = (processor: ConcatProcessor): ESQLAstCommand[] => {
  const { to, from, where } = processor;

  // Param validation of required fields
  if (!to) {
    throw new Error('Concat processor requires a target field.');
  }
  if (!from) {
    throw new Error('Concat processor requires from source fields or literals.');
  }

  const commands: ESQLAstCommand[] = [];

  const fromValues = from.map((item) => {
    if (item.type === 'field') {
      return Builder.expression.column(item.value);
    }
    return Builder.expression.literal.string(item.value);
  });

  const toColumn = Builder.expression.column(to);
  const concatFunction = Builder.expression.func.call('CONCAT', fromValues);

  if (where && !('always' in where)) {
    // conditional concat: use CASE to conditionally set the target field to the concatenated value, nil otherwise
    // EVAL target_field = CASE(<condition>, CONCAT(fromValues), nil)
    const conditionExpression = conditionToESQLAst(where);
    const caseExpression = Builder.expression.func.call('CASE', [
      conditionExpression,
      concatFunction,
      Builder.expression.literal.nil(),
    ]);
    const evalCommand = Builder.command({
      name: 'eval',
      args: [Builder.expression.func.binary('=', [toColumn, caseExpression])],
    });
    commands.push(evalCommand);
  } else {
    // always set to concatenated value if no condition
    const evalCommand = Builder.command({
      name: 'eval',
      args: [Builder.expression.func.binary('=', [toColumn, concatFunction])],
    });
    commands.push(evalCommand);
  }
  return commands;
};
