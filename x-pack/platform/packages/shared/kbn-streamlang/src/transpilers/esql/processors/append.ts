/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-ast';
import type { ESQLAstCommand } from '@kbn/esql-ast';
import type { AppendProcessor } from '../../../../types/processors';
import { conditionToESQLAst, esqlLiteralFromAny } from '../condition_to_esql';

export function convertAppendProcessorToESQL(processor: AppendProcessor): ESQLAstCommand[] {
  const {
    to,
    value, // eslint-disable-next-line @typescript-eslint/naming-convention
    allow_duplicates = true, // default to true to match Append Ingest Processor
    where,
  } = processor as AppendProcessor;
  const toColumn = Builder.expression.column(to);
  const appendValueExpression = esqlLiteralFromAny(value);

  let appendExpression = Builder.expression.func.call('MV_APPEND', [
    toColumn,
    appendValueExpression,
  ]);

  if (!allow_duplicates) {
    appendExpression = Builder.expression.func.call('MV_DEDUPE', [appendExpression]);
  }

  // If the target field is null, set it to the new value. Otherwise, append.
  let appendAssignment = Builder.expression.func.call('CASE', [
    Builder.expression.func.postfix('IS NULL', toColumn),
    appendValueExpression,
    appendExpression,
  ]);

  if (where) {
    const whereCondition = conditionToESQLAst(where);
    appendAssignment = Builder.expression.func.call('CASE', [
      whereCondition,
      appendAssignment,
      toColumn,
    ]);
  }

  return [
    Builder.command({
      name: 'eval',
      args: [Builder.expression.func.binary('=', [toColumn, appendAssignment])],
    }),
  ];
}
