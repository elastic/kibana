/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder, type ESQLAstCommand } from '@kbn/esql-language';
import type { JoinProcessor } from '../../../../types/processors';
import { conditionToESQLAst } from '../condition_to_esql';

/**
 * Converts a Streamlang JoinProcessor into a list of ES|QL AST commands.
 *
 * @example Unconditional:
 * {
 *   action: 'join',
 *   from: ['field1', 'field2', 'field3'],
 *   to: 'my_joined_field',
 *   delimiter: ', ',
 * }
 *
 *  Generates:
 *  | EVAL my_joined_field = CONCAT(field1, ", ", field2, ", ", field3)
 *
 * @example Conditional:
 * {
 *   action: 'join',
 *   from: ['field1', 'field2', 'field3'],
 *   to: 'my_joined_field',
 *   delimiter: ', ',
 *   where: {
 *     field: 'field1',
 *     eq: 'first',
 *   },
 * }
 *
 *  Generates:
 *  | EVAL my_joined_field = CASE(field1 == "first", CONCAT(field1, ", ", field2, ", ", field3), NULL)
 */
export function convertJoinProcessorToESQL(processor: JoinProcessor): ESQLAstCommand[] {
  const { to, delimiter, from } = processor;

  const commands: ESQLAstCommand[] = [];

  const delimiterExpression = Builder.expression.literal.string(delimiter);

  const fromColumns = from.flatMap((item, i) => {
    const column = Builder.expression.column(item);

    return i < from.length - 1 ? [column, delimiterExpression] : [column];
  });

  const toColumn = Builder.expression.column(to);
  const concatExpression = Builder.expression.func.call('CONCAT', fromColumns);

  if ('where' in processor && processor.where && !('always' in processor.where)) {
    const conditionExpression = conditionToESQLAst(processor.where);
    const caseExpression = Builder.expression.func.call('CASE', [
      conditionExpression,
      concatExpression,
      Builder.expression.literal.nil(),
    ]);
    const evalCommand = Builder.command({
      name: 'eval',
      args: [Builder.expression.func.binary('=', [toColumn, caseExpression])],
    });
    commands.push(evalCommand);
  } else {
    const evalCommand = Builder.command({
      name: 'eval',
      args: [Builder.expression.func.binary('=', [toColumn, concatExpression])],
    });
    commands.push(evalCommand);
  }

  return commands;
}
