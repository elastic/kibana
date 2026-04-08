/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@elastic/esql';
import type { ESQLAstCommand, ESQLAstExpression } from '@elastic/esql/types';
import type {
  JsonExtractProcessor,
  JsonExtraction,
  JsonExtractType,
} from '../../../../types/processors';
import { buildIgnoreMissingFilter } from './common';
import { conditionToESQLAst } from '../condition_to_esql';
import { validateJsonPath } from '../../shared/json_path_parser';

/**
 * Resolves the ES|QL type conversion function name for a given JsonExtractType.
 * Since JSON_EXTRACT returns keyword, we need to cast to the desired type.
 *
 * @param type - The target type for the extraction
 * @returns The ES|QL function name for type conversion, or null for keyword (no conversion needed)
 */
function resolveTypeConversionFunction(type: JsonExtractType): string | null {
  switch (type) {
    case 'integer':
      return 'TO_INTEGER';
    case 'long':
      return 'TO_LONG';
    case 'double':
      return 'TO_DOUBLE';
    case 'boolean':
      return 'TO_BOOLEAN';
    case 'keyword':
    default:
      return null;
  }
}

/**
 * Wraps a JSON_EXTRACT expression with type conversion if needed.
 *
 * @param jsonExtractExpr - The JSON_EXTRACT function expression
 * @param type - The target type (defaults to 'keyword')
 * @returns The expression, optionally wrapped in a type conversion function
 */
function applyTypeConversion(
  jsonExtractExpr: ESQLAstExpression,
  type: JsonExtractType = 'keyword'
): ESQLAstExpression {
  const conversionFunc = resolveTypeConversionFunction(type);
  if (!conversionFunc) {
    return jsonExtractExpr;
  }
  return Builder.expression.func.call(conversionFunc, [jsonExtractExpr]);
}

/**
 * Builds the extraction expression for a single extraction configuration.
 * Validates the selector syntax before building the expression.
 *
 * @param fromColumn - The source column containing the JSON string
 * @param extraction - The extraction specification
 * @returns The expression for extracting and optionally casting the value
 * @throws {JsonPathParseError} If the selector has invalid syntax
 */
function buildExtractionExpression(
  fromColumn: ESQLAstExpression,
  extraction: JsonExtraction
): ESQLAstExpression {
  validateJsonPath(extraction.selector);
  const selectorLiteral = Builder.expression.literal.string(extraction.selector);
  const jsonExtractFunction = Builder.expression.func.call('JSON_EXTRACT', [
    fromColumn,
    selectorLiteral,
  ]);
  return applyTypeConversion(jsonExtractFunction, extraction.type ?? 'keyword');
}

/**
 * Converts a Streamlang JsonExtractProcessor into a list of ES|QL AST commands.
 *
 * For unconditional extraction (no 'where' or 'where: always'):
 *   Uses EVAL with JSON_EXTRACT() function for each extraction, wrapped in type conversion:
 *   EVAL target_field1 = TO_INTEGER(JSON_EXTRACT(field, "selector1")), target_field2 = JSON_EXTRACT(field, "selector2")
 *
 * For conditional extraction (with 'where' condition):
 *   Uses EVAL with CASE for each extraction:
 *   EVAL target_field = CASE(<condition>, TO_INTEGER(JSON_EXTRACT(field, "selector")), NULL)
 *
 * Type conversion:
 * - keyword (default): No conversion needed (JSON_EXTRACT returns keyword)
 * - integer: TO_INTEGER(JSON_EXTRACT(...))
 * - long: TO_LONG(JSON_EXTRACT(...))
 * - double: TO_DOUBLE(JSON_EXTRACT(...))
 * - boolean: TO_BOOLEAN(JSON_EXTRACT(...))
 *
 * Filters applied for Ingest Pipeline parity:
 * - When `ignore_missing: false`: `WHERE NOT(field IS NULL)` filters missing fields
 *
 * Limitations:
 * - JSON_EXTRACT does not support wildcards, recursive descent, array slicing, filter expressions, or negative array indices
 * - `ignore_failure` has no ES|QL equivalent. In Ingest Pipeline, a failing script processor
 *   can be caught by `ignore_failure: true`; in ES|QL, a runtime error (e.g. non-string input
 *   to JSON_EXTRACT) will fail the entire query. This is an inherent transpilation gap.
 *
 * @example Unconditional with type:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'json_extract',
 *          field: 'message',
 *          extractions: [
 *            { selector: 'user.id', target_field: 'user_id' },
 *            { selector: 'count', target_field: 'event_count', type: 'integer' },
 *          ],
 *        } as JsonExtractProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL `user_id` = JSON_EXTRACT(`message`, "user.id"), `event_count` = TO_INTEGER(JSON_EXTRACT(`message`, "count"))
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
 *            { selector: 'user.id', target_field: 'user_id', type: 'keyword' },
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

  const fromColumn = Builder.expression.column(field);
  const hasConditionalWhere =
    'where' in processor && processor.where && !('always' in processor.where);

  if (hasConditionalWhere) {
    const conditionExpression = conditionToESQLAst(processor.where!);

    const assignments = extractions.map((extraction) => {
      const targetColumn = Builder.expression.column(extraction.target_field);
      const extractionExpr = buildExtractionExpression(fromColumn, extraction);

      const elseExpression =
        extraction.target_field === field ? fromColumn : Builder.expression.literal.nil();

      const caseExpression = Builder.expression.func.call('CASE', [
        conditionExpression,
        extractionExpr,
        elseExpression,
      ]);

      return Builder.expression.func.binary('=', [targetColumn, caseExpression]);
    });

    const evalCommand = Builder.command({
      name: 'eval',
      args: assignments,
    });

    commands.push(evalCommand);
  } else {
    const missingFieldFilter = buildIgnoreMissingFilter(ignore_missing, field);
    if (missingFieldFilter) {
      commands.push(missingFieldFilter);
    }

    const assignments = extractions.map((extraction) => {
      const targetColumn = Builder.expression.column(extraction.target_field);
      const extractionExpr = buildExtractionExpression(fromColumn, extraction);

      return Builder.expression.func.binary('=', [targetColumn, extractionExpr]);
    });

    const evalCommand = Builder.command({
      name: 'eval',
      args: assignments,
    });

    commands.push(evalCommand);
  }

  return commands;
}
