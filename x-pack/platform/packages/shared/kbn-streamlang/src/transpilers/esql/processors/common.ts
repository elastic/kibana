/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-language';
import type { ESQLAstCommand, ESQLAstItem } from '@kbn/esql-language';
import type { Condition } from '../../../../types/conditions';
import type { DissectGrokPatternField } from '../../../../types/formats';

/**
 * Cast (or create) each listed field to string to normalize branch schemas
 * @param fieldNames List of field names to cast
 * @returns List of ESQL AST commands to perform the casts
 * */
export function castFieldsToString(fieldNames: string[]): ESQLAstCommand[] {
  return fieldNames.map((name) =>
    Builder.command({
      name: 'eval',
      args: [
        Builder.expression.func.binary('=', [
          Builder.expression.column(name),
          Builder.expression.func.call('TO_STRING', [Builder.expression.column(name)]),
        ]),
      ],
    })
  );
}

/**
 * Cast each GROK field to its configured type (int, float, keyword)
 * @param grokFields List of fields with their configured GROK types
 * @returns List of ESQL AST commands to perform the casts
 */
export function castFieldsToGrokTypes(grokFields: DissectGrokPatternField[]): ESQLAstCommand[] {
  return grokFields.map((f) => {
    let funcName: string;
    if (f.type === 'long') {
      funcName = 'TO_LONG';
    } else if (f.type === 'int') {
      funcName = 'TO_INTEGER';
    } else if (f.type === 'float') {
      funcName = 'TO_DOUBLE';
    } else {
      funcName = 'TO_STRING';
    }
    return Builder.command({
      name: 'eval',
      args: [
        Builder.expression.func.binary('=', [
          Builder.expression.column(f.name),
          Builder.expression.func.call(funcName, [Builder.expression.column(f.name)]),
        ]),
      ],
    });
  });
}

export function combineAnd(predicates: ESQLAstItem[]): ESQLAstItem | null {
  if (predicates.length === 0) return null;
  return predicates.reduce((acc, c) => (acc ? Builder.expression.func.binary('and', [acc, c]) : c));
}

export function combineOr(predicates: ESQLAstItem[]): ESQLAstItem | null {
  if (predicates.length === 0) return null;
  return predicates.reduce((acc, c) => (acc ? Builder.expression.func.binary('or', [acc, c]) : c));
}

/**
 * Creates a WHERE command to filter out documents with missing source fields when `ignore_missing: false`.
 * This simulates Ingest Pipeline's "field [field] not present" error behavior by pre-filtering documents.
 *
 * Behavioral Context:
 * - ignore_failure is implicitly false (not supported in Streamlang DSL yet)
 * - When ignore_failure = false, Ingest Pipeline fails on both missing fields AND pattern mismatches
 * - ES|QL can only simulate the missing field case with WHERE filtering
 * - Pattern mismatch failures cannot be (in a reasonable fashion) simulated in ES|QL (they nullify target fields instead)
 *
 * @param sourceField - The source field name to check for NULL/missing values
 * @param ignoreMissing - If false, returns WHERE command to filter missing fields
 * @returns WHERE command if filtering needed, undefined otherwise
 */
export function buildIgnoreMissingFilter(
  sourceField: string,
  ignoreMissing: boolean
): ESQLAstCommand | undefined {
  if (ignoreMissing) {
    return undefined; // No filtering needed when ignore_missing = true
  }

  const fromColumn = Builder.expression.column(sourceField);
  return Builder.command({
    name: 'where',
    args: [
      Builder.expression.func.call('NOT', [Builder.expression.func.postfix('IS NULL', fromColumn)]),
    ],
  });
}

/**
 * Creates a WHERE command to filter out documents with existing target fields when `override: false`.
 * This simulates Ingest Pipeline's "field [field] already exists" error behavior by pre-filtering documents.
 *
 * Behavioral Context:
 * - ignore_failure is implicitly false (not supported in Streamlang DSL yet)
 * - When ignore_failure = false, override = false make Ingest Pipeline fail if target field already exists
 * - ES|QL uses WHERE filtering to exclude documents with existing target fields
 * - This aligns the behavior between Ingest Pipeline errors and ES|QL filtering
 *
 * @param targetField - The target field name to check for existence
 * @param override - If false, returns WHERE command to filter existing target fields
 * @returns WHERE command if filtering needed, undefined otherwise
 */
export function buildOverrideFilter(
  targetField: string,
  override: boolean
): ESQLAstCommand | undefined {
  if (override) {
    return undefined; // No filtering needed when override = true
  }

  const toColumn = Builder.expression.column(targetField);
  return Builder.command({
    name: 'where',
    args: [Builder.expression.func.postfix('IS NULL', toColumn)],
  });
}

export function buildWhereCondition(
  fromField: string,
  ignoreMissing: boolean,
  where: Condition | undefined,
  conditionToESQL: (c: Condition) => ESQLAstItem
): ESQLAstItem {
  const predicates: ESQLAstItem[] = [];
  if (ignoreMissing) predicates.push(conditionToESQL({ field: fromField, exists: true }));
  if (where) predicates.push(conditionToESQL(where));
  return combineAnd(predicates) ?? Builder.expression.literal.boolean(true);
}
