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
 */
export function convertSortProcessorToESQL(processor: SortProcessor): ESQLAstCommand[] {
  const { from, to, order = 'asc' } = processor;

  const commands: ESQLAstCommand[] = [];

  const fromColumn = Builder.expression.column(from);
  const targetColumn = Builder.expression.column(to ?? from);
  const orderLiteral = Builder.expression.literal.string(order.toUpperCase());

  // Build MV_SORT() function call
  const sortFunction = Builder.expression.func.call('MV_SORT', [fromColumn, orderLiteral]);

  // Check if this is conditional or unconditional sort
  if ('where' in processor && processor.where && !('always' in processor.where)) {
    // Conditional sort: use EVAL with CASE
    // EVAL target_field = CASE(<condition>, MV_SORT(field, order), existing_value)
    const conditionExpression = conditionToESQLAst(processor.where);

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
