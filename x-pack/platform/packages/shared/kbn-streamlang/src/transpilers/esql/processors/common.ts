/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-ast';
import type { ESQLAstCommand, ESQLAstItem } from '@kbn/esql-ast';
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
