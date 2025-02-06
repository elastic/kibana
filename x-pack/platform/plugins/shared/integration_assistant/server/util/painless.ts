/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldPath } from './fields';

/**
 * Branded type respresenting a string that is a safe Painless expression.
 *
 * Painless is a scripting language used in Elasticsearch, here we are using it to
 * generate the ingest pipeline with Automatic Import.
 *
 * This type is used to ensure that a string has been validated
 * and is considered safe to be used as a Painless expression.
 * The `__isSafePainlessExpression` property is a type brand
 * to distinguish this type from a regular string.
 */
export type SafePainlessExpression = string & { __isSafePainlessExpression: true };

export type SafeNonNullablePainlessExpression = SafePainlessExpression & {
  __isNonNullablePainlessExpression: true;
};

/**
 * A constant representing the context variable used in Elasticsearch ingest pipeline painless scripts.
 * This is typed as a safe painless expression to ensure type safety when used in pipeline definitions.
 *
 * @link https://www.elastic.co/guide/en/elasticsearch/painless/8.17/painless-contexts.html
 * @constant {SafePainlessExpression}
 */
const INGEST_PIPELINE_PAINLESS_CONTEXT = 'ctx' as const as SafePainlessExpression;

/**
 * A regular expression that matches valid Painless script identifiers.
 *
 * Identifiers in Painless
 * must start with an underscore or a letter (a-z, A-Z), followed by any combination
 * of underscores, letters, or digits.
 *
 * This regular expression ensures that the identifier conforms to these rules:
 * - The first character must be an underscore or a letter.
 * - Subsequent characters can be underscores, letters, or digits.
 *
 * This is the ID and DOTID regexp in the Painless grammar under the following link:
 * @link src/platform/packages/shared/kbn-monaco/src/painless/antlr/painless_parser.g4
 */
const PAINLESS_IDENTIFIER_REGEXP = /^[_a-zA-Z][_a-zA-Z0-9]*$/;

/**
 * Checks if a given string is a valid Painless identifier (though possibly a reserved word).
 *
 * @link https://www.elastic.co/guide/en/elasticsearch/painless/8.17/painless-identifiers.html
 * @param s - The string to check.
 * @returns `true` if the string is a valid Painless identifier, `false` otherwise.
 */
export function isPainlessIdentifier(s: string): boolean {
  return PAINLESS_IDENTIFIER_REGEXP.test(s);
}

/**
 * Creates a string literal for use in Painless scripts.
 *
 * Quoting rules:
 *  - Use a \" token to include a double-quote as part of a double-quoted string literal.
 *  - Use a \\ token to include a backslash as part of any string literal.
 *
 * @link https://www.elastic.co/guide/en/elasticsearch/painless/8.17/painless-literals.html#string-literals
 * @param s - The string to escape.
 * @returns The escaped string.
 */
export function painlessStringRepresentation(s: string): SafePainlessExpression {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"` as SafePainlessExpression;
}

/**
 * Adds a field access to a Painless expression.
 *
 * This function is used to add a field access to a Painless expression.
 * It ensures that the field access is properly escaped and that the expression remains safe.
 * It is still possible to access fields that are not valid Painless identifiers by using a map access.
 *
 * @param expr - The Painless expression to add the field access to.
 * @param fieldName - The subfield to access.
 * @returns The new Painless expression with the added field access; safe but possibly null.
 */
export function addPainlessFieldAccess(
  fieldName: string,
  expr: SafePainlessExpression,
  exprNullable: boolean = true
): SafePainlessExpression {
  const nonNullableExpr = exprNullable ? (`${expr}?` as SafePainlessExpression) : expr;
  const isValidIdentifier = isPainlessIdentifier(fieldName);

  if (isValidIdentifier) {
    return `${nonNullableExpr}.${fieldName}` as SafePainlessExpression;
  }

  const representedName = painlessStringRepresentation(fieldName);
  return `${nonNullableExpr}.get(${representedName})` as SafePainlessExpression;
}

/**
 * Converts a field path to a Painless script expression.
 *
 * This function takes a `FieldPath` (an array of strings representing the path to a field)
 * and converts it into a `SafePainlessExpression` by reducing the array and adding Painless
 * field access for each subfield.
 *
 * We assume that all field paths accesses except the context itself can result in nullable fields,
 * so we always add a null check before accessing the subfields.
 *
 * @param fieldPath - The path to the field as an array of strings.
 * @returns A `SafePainlessExpression` representing the field path in Painless script syntax.
 */
export function fieldPathToPainlessExpression(fieldPath: FieldPath): SafePainlessExpression {
  return fieldPath.reduce(
    (expr: SafePainlessExpression, subfield: string) =>
      addPainlessFieldAccess(subfield, expr, expr !== INGEST_PIPELINE_PAINLESS_CONTEXT),
    INGEST_PIPELINE_PAINLESS_CONTEXT
  );
}
