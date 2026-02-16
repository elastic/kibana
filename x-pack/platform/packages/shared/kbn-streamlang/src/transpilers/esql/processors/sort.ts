/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-language';
import type { ESQLAstCommand } from '@kbn/esql-language';
import type { SortProcessor } from '../../../../types/processors';
import { conditionToESQLAst } from '../condition_to_esql';

/**
 * Converts a Streamlang SortProcessor into a list of ES|QL AST commands.
 *
 * For unconditional sort (no 'where' or 'where: always'):
 *   Uses EVAL with MV_SORT() function: EVAL target_field = MV_SORT(field, "ASC"|"DESC")
 *   If `to` is not provided, updates field in-place: EVAL field = MV_SORT(field, "ASC"|"DESC")
 *
 * For conditional sort (with 'where' condition):
 *   Uses EVAL with CASE: EVAL target_field = CASE(<condition>, MV_SORT(field, order), existing_value)
 *   If `to` is not provided, updates field in-place
 *
 * For ignore_missing:
 *   Uses EVAL with CASE to check if field is not null before sorting:
 *   EVAL field = CASE(IS_NOT_NULL(field), MV_SORT(field, order), field)
 *
 * Notes:
 * - ES|QL's MV_SORT function sorts a multivalued field in lexicographical order.
 * - The order parameter can be "ASC" (default) or "DESC".
 * - This provides similar functionality to the Ingest Pipeline sort processor.
 *
 * @example Unconditional (in-place, ascending):
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'sort',
 *          from: 'tags',
 *        } as SortProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL tags = MV_SORT(tags, "ASC")
 *    ```
 *
 * @example Unconditional (descending with target field):
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'sort',
 *          from: 'values',
 *          to: 'sorted_values',
 *          order: 'desc',
 *        } as SortProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL sorted_values = MV_SORT(values, "DESC")
 *    ```
 *
 * @example Conditional:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'sort',
 *          from: 'tags',
 *          order: 'desc',
 *          where: { field: 'status', eq: 'active' },
 *        } as SortProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL tags = CASE(status == "active", MV_SORT(tags, "DESC"), tags)
 *    ```
 *
 * @example With ignore_missing:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'sort',
 *          from: 'tags',
 *          ignore_missing: true,
 *        } as SortProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL tags = CASE(IS_NOT_NULL(tags), MV_SORT(tags, "ASC"), tags)
 *    ```
 */
export function convertSortProcessorToESQL(processor: SortProcessor): ESQLAstCommand[] {
  const { from, to, order = 'asc', ignore_missing } = processor;

  const commands: ESQLAstCommand[] = [];

  const fromColumn = Builder.expression.column(from);
  const targetColumn = Builder.expression.column(to ?? from);
  const orderLiteral = Builder.expression.literal.string(order.toUpperCase());

  // Build MV_SORT() function call
  const sortFunction = Builder.expression.func.call('MV_SORT', [fromColumn, orderLiteral]);

  // Check if this is conditional or unconditional sort
  const hasCondition = 'where' in processor && processor.where && !('always' in processor.where);

  if (hasCondition || ignore_missing) {
    // Build the condition expression
    let conditionExpression;

    if (hasCondition && ignore_missing) {
      // Combine where condition with null check: (condition) AND (field IS NOT NULL)
      const whereCondition = conditionToESQLAst(processor.where!);
      const notNullCheck = Builder.expression.func.call('IS_NOT_NULL', [fromColumn]);
      conditionExpression = Builder.expression.func.binary('and', [whereCondition, notNullCheck]);
    } else if (hasCondition) {
      conditionExpression = conditionToESQLAst(processor.where!);
    } else {
      // Just ignore_missing: field IS NOT NULL
      conditionExpression = Builder.expression.func.call('IS_NOT_NULL', [fromColumn]);
    }

    // For CASE else clause: use target field if it exists, else use source field
    const elseValue = to ? targetColumn : fromColumn;

    const caseExpression = Builder.expression.func.call('CASE', [
      conditionExpression,
      sortFunction,
      elseValue, // ELSE keep existing value
    ]);

    const evalCommand = Builder.command({
      name: 'eval',
      args: [Builder.expression.func.binary('=', [targetColumn, caseExpression])],
    });

    commands.push(evalCommand);
  } else {
    // Unconditional sort: use EVAL with MV_SORT() function
    // EVAL target_field = MV_SORT(field, order)
    const evalCommand = Builder.command({
      name: 'eval',
      args: [Builder.expression.func.binary('=', [targetColumn, sortFunction])],
    });

    commands.push(evalCommand);
  }

  return commands;
}
