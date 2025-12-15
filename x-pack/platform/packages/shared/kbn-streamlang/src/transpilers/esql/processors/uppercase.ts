/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-ast';
import type { ESQLAstCommand } from '@kbn/esql-ast';
import type { UppercaseProcessor } from '../../../../types/processors';
import { buildIgnoreMissingFilter } from './common';
import { conditionToESQLAst } from '../condition_to_esql';

export function convertUppercaseProcessorToESQL(processor: UppercaseProcessor): ESQLAstCommand[] {
  const {
    from,
    to,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ignore_missing = false,
  } = processor;

  const commands: ESQLAstCommand[] = [];

  // Add missing field filter if needed (ignore_missing = false)
  const missingFieldFilter = buildIgnoreMissingFilter(from, ignore_missing);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  const fromColumn = Builder.expression.column(from);
  const toColumn = Builder.expression.column(to ?? from); // If no target field is provided, use the source field
  const uppercaseFunction = Builder.expression.func.call('TO_UPPER', [fromColumn]);

  // Check if this is conditional or unconditional uppercase
  if ('where' in processor && processor.where && !('always' in processor.where)) {
    // Conditional replacement: use EVAL with CASE
    // EVAL target_field = CASE(<condition>, TO_UPPER(to), fromColumn ?? nil)
    const conditionExpression = conditionToESQLAst(processor.where);
    const elseValue = to ? Builder.expression.literal.nil() : fromColumn;
    const caseExpression = Builder.expression.func.call('CASE', [
      conditionExpression,
      uppercaseFunction,
      elseValue,
    ]);
    const evalCommand = Builder.command({
      name: 'EVAL',
      args: [Builder.expression.func.binary('=', [toColumn, caseExpression])],
    });
    commands.push(evalCommand);
  } else {
    // Unconditional uppercase: use EVAL with TO_UPPER() function
    const evalCommand = Builder.command({
      name: 'EVAL',
      args: [Builder.expression.func.binary('=', [toColumn, uppercaseFunction])],
    });
    commands.push(evalCommand);
  }

  return commands;
}
