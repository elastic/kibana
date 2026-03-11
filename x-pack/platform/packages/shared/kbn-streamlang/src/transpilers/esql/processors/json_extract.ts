/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@elastic/esql';
import type { ESQLAstCommand } from '@elastic/esql/types';
import type { JsonExtractProcessor } from '../../../../types/processors';
import { buildIgnoreMissingFilter } from './common';
import { conditionToESQLAst } from '../condition_to_esql';

/**
 * Converts a Streamlang JsonExtractProcessor into a list of ES|QL AST commands.
 *
 * For unconditional extraction (no 'where' or 'where: always'):
 *   Uses EVAL with JSON_EXTRACT() function for each extraction:
 *   EVAL target_field1 = JSON_EXTRACT(field, "selector1"), target_field2 = JSON_EXTRACT(field, "selector2")
 *
 * For conditional extraction (with 'where' condition):
 *   Uses EVAL with CASE for each extraction:
 *   EVAL target_field = CASE(<condition>, JSON_EXTRACT(field, "selector"), NULL)
 *
 * Filters applied for Ingest Pipeline parity:
 * - When `ignore_missing: false`: `WHERE NOT(field IS NULL)` filters missing fields
 *
 * Limitations:
 * - ES|QL's JSON_EXTRACT returns keyword type, while Ingest Pipeline preserves types
 * - JSON_EXTRACT does not support wildcards, recursive descent, array slicing, filter expressions, or negative array indices
 *
 * @example Unconditional:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'json_extract',
 *          field: 'message',
 *          extractions: [
 *            { selector: 'user.id', target_field: 'user_id' },
 *            { selector: 'metadata.client.ip', target_field: 'client_ip' },
 *          ],
 *        } as JsonExtractProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL `user_id` = JSON_EXTRACT(`message`, "user.id"), `client_ip` = JSON_EXTRACT(`message`, "metadata.client.ip")
 *    ```
 *
 * @example Conditional:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'json_extract',
 *          field: 'message',
 *          extractions: [
 *            { selector: 'user.id', target_field: 'user_id' },
 *          ],
 *          where: { field: 'status', eq: 'active' },
 *        } as JsonExtractProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL `user_id` = CASE(status == "active", JSON_EXTRACT(`message`, "user.id"), NULL)
 *    ```
 */
export function convertJsonExtractProcessorToESQL(
  processor: JsonExtractProcessor
): ESQLAstCommand[] {
  const { field, extractions, ignore_missing = false } = processor;

  const commands: ESQLAstCommand[] = [];

  const missingFieldFilter = buildIgnoreMissingFilter(ignore_missing, field);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  const fromColumn = Builder.expression.column(field);

  if ('where' in processor && processor.where && !('always' in processor.where)) {
    const conditionExpression = conditionToESQLAst(processor.where);

    const assignments = extractions.map((extraction) => {
      const targetColumn = Builder.expression.column(extraction.target_field);
      const selectorLiteral = Builder.expression.literal.string(extraction.selector);
      const jsonExtractFunction = Builder.expression.func.call('JSON_EXTRACT', [
        fromColumn,
        selectorLiteral,
      ]);

      const caseExpression = Builder.expression.func.call('CASE', [
        conditionExpression,
        jsonExtractFunction,
        Builder.expression.literal.nil(),
      ]);

      return Builder.expression.func.binary('=', [targetColumn, caseExpression]);
    });

    const evalCommand = Builder.command({
      name: 'eval',
      args: assignments,
    });

    commands.push(evalCommand);
  } else {
    const assignments = extractions.map((extraction) => {
      const targetColumn = Builder.expression.column(extraction.target_field);
      const selectorLiteral = Builder.expression.literal.string(extraction.selector);
      const jsonExtractFunction = Builder.expression.func.call('JSON_EXTRACT', [
        fromColumn,
        selectorLiteral,
      ]);

      return Builder.expression.func.binary('=', [targetColumn, jsonExtractFunction]);
    });

    const evalCommand = Builder.command({
      name: 'eval',
      args: assignments,
    });

    commands.push(evalCommand);
  }

  return commands;
}
