/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-ast';
import type { ESQLAstCommand } from '@kbn/esql-ast';
import { isProcessWithOverrideOption, type SetProcessor } from '../../../../types/processors';
import { conditionToESQLAst, esqlLiteralFromAny } from '../condition_to_esql';

export function convertSetProcessorToESQL(processor: SetProcessor): ESQLAstCommand[] {
  const setProcessor = processor as SetProcessor;

  // Param validation
  // Throw error if neither `value` nor `copy_from` is specified
  if (setProcessor.value === undefined && setProcessor.copy_from === undefined) {
    throw new Error(`Set processor requires either 'value' or 'copy_from' parameter.`);
  }

  // Throw error if both `value` and `copy_from` are specified
  if (setProcessor.value !== undefined && setProcessor.copy_from !== undefined) {
    throw new Error(`Set processor cannot have both 'value' and 'copy_from' parameters.`);
  }

  // Param handling
  // Handle `copy_from` if specified, otherwise use literal fron `value`
  let valueExpression = esqlLiteralFromAny(setProcessor.value);
  if (setProcessor.copy_from) {
    valueExpression = Builder.expression.column(setProcessor.copy_from);
  }

  const whereExpression = processor.where ? conditionToESQLAst(processor.where) : null;
  const overrideExpression =
    isProcessWithOverrideOption(processor) && processor.override === false
      ? conditionToESQLAst({ field: processor.to, exists: false })
      : null;

  const mergedWhereExpression =
    whereExpression && overrideExpression
      ? Builder.expression.func.binary('and', [whereExpression, overrideExpression])
      : whereExpression || overrideExpression;

  // If there's a where condition or override is false, we need to use a CASE statement
  const assignment = mergedWhereExpression
    ? Builder.expression.func.call('CASE', [
        mergedWhereExpression,
        valueExpression,
        Builder.expression.column(setProcessor.to), // ELSE keep existing value
      ])
    : valueExpression;

  return [
    Builder.command({
      name: 'eval',
      args: [
        Builder.expression.func.binary('=', [
          Builder.expression.column(setProcessor.to),
          assignment,
        ]),
      ],
    }),
  ];
}
