/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-language';
import type { ESQLAstCommand } from '@kbn/esql-language';
import { buildIgnoreMissingFilter } from './processors/common';
import { conditionToESQLAst } from './condition_to_esql';
import type { Condition } from '../../../types/conditions';

export const createTransformStringESQL = (esqlFunc: string) => {
  return (processor: {
    from: string;
    to?: string;
    ignore_missing?: boolean;
    where?: Condition;
  }): ESQLAstCommand[] => {
    const { from, to, ignore_missing = false } = processor;
    const commands: ESQLAstCommand[] = [];

    // Add missing field filter if needed (ignore_missing = false)
    const missingFieldFilter = buildIgnoreMissingFilter(from, ignore_missing);
    if (missingFieldFilter) {
      commands.push(missingFieldFilter);
    }

    const fromColumn = Builder.expression.column(from);
    const toColumn = Builder.expression.column(to ?? from); // If no target field is provided, use the source field
    const func = Builder.expression.func.call(esqlFunc, [fromColumn]);

    // Check if this is conditional or unconditional transform string
    if ('where' in processor && processor.where && !('always' in processor.where)) {
      // Conditional replacement: use EVAL with CASE
      // EVAL target_field = CASE(<condition>, <esqlFunc>(to), fromColumn ?? nil)
      const conditionExpression = conditionToESQLAst(processor.where);
      const elseValue = to ? Builder.expression.literal.nil() : fromColumn;
      const caseExpression = Builder.expression.func.call('CASE', [
        conditionExpression,
        func,
        elseValue,
      ]);
      const evalCommand = Builder.command({
        name: 'EVAL',
        args: [Builder.expression.func.binary('=', [toColumn, caseExpression])],
      });
      commands.push(evalCommand);
    } else {
      // Unconditional transform string: use EVAL with <esqlFunc>() function
      const evalCommand = Builder.command({
        name: 'EVAL',
        args: [Builder.expression.func.binary('=', [toColumn, func])],
      });
      commands.push(evalCommand);
    }

    return commands;
  };
};
