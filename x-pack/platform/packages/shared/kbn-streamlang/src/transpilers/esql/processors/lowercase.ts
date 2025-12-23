/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-language';
import type { ESQLAstCommand } from '@kbn/esql-language';
import type { LowercaseProcessor } from '../../../../types/processors';
import { conditionToESQLAst } from '../condition_to_esql';
import { buildIgnoreMissingFilter } from './common';

export function convertLowercaseProcessorToESQL(processor: LowercaseProcessor): ESQLAstCommand[] {
  const { from, to, ignore_missing = false } = processor;

  const commands: ESQLAstCommand[] = [];

  // Add missing field filter if needed (ignore_missing = false)
  const missingFieldFilter = buildIgnoreMissingFilter(from, ignore_missing);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  const fromColumn = Builder.expression.column(from);
  const toColumn = Builder.expression.column(to ?? from); // If no target field is provided, use the source field
  const lowercaseFunction = Builder.expression.func.call('TO_LOWER', [fromColumn]);

  // Check if this is conditional or unconditional lowercase
  if ('where' in processor && processor.where && !('always' in processor.where)) {
    // Conditional replacement: use EVAL with CASE
    // EVAL target_field = CASE(<condition>, TO_LOWER(to), fromColumn ?? nil)
    const conditionExpression = conditionToESQLAst(processor.where);
    const elseValue = to ? Builder.expression.literal.nil() : fromColumn;
    const caseExpression = Builder.expression.func.call('CASE', [
      conditionExpression,
      lowercaseFunction,
      elseValue,
    ]);
    const evalCommand = Builder.command({
      name: 'EVAL',
      args: [Builder.expression.func.binary('=', [toColumn, caseExpression])],
    });
    commands.push(evalCommand);
  } else {
    // Unconditional lowercase: use EVAL with TO_LOWER() function
    const evalCommand = Builder.command({
      name: 'EVAL',
      args: [Builder.expression.func.binary('=', [toColumn, lowercaseFunction])],
    });
    commands.push(evalCommand);
  }

  return commands;
}
