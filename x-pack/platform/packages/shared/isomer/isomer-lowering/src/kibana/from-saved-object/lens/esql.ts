/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const escapeEsqlIdentifier = (name: string): string =>
  /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) ? name : `\`${name.replace(/`/g, '``')}\``;

export const escapeField = escapeEsqlIdentifier;

export const esqlStringLiteral = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

export const escapeStringLiteral = esqlStringLiteral;

/** The scalar types a Kibana phrase/phrases filter can carry. */
export type EsqlScalar = string | number | boolean;

export const isEsqlScalar = (value: unknown): value is EsqlScalar =>
  typeof value === 'string' ||
  typeof value === 'boolean' ||
  (typeof value === 'number' && Number.isFinite(value));

/**
 * An ES|QL literal for a filter value, quoted only when it is a string.
 *
 * Kibana stores numeric and boolean phrase values as themselves — an HTTP
 * status filter is `404`, not `"404"` — and quoting one compares a number
 * field against a string, which matches nothing.
 */
export const esqlScalarLiteral = (value: EsqlScalar): string =>
  typeof value === 'string' ? esqlStringLiteral(value) : String(value);

export const esqlSource = (source: string): string => escapeEsqlIdentifier(source);

export const esqlAggregate = (fn: string, field: string | undefined): string | undefined => {
  if (fn === 'COUNT' && !field) {
    return 'COUNT(*)';
  }
  if (!field) {
    return undefined;
  }
  return `${fn}(${escapeEsqlIdentifier(field)})`;
};

export const mergeAggWhere = (aggExpression: string, where: string): string => {
  const whereIdx = aggExpression.indexOf(' WHERE ');
  if (whereIdx < 0) {
    return `${aggExpression} WHERE ${where}`;
  }
  const head = aggExpression.slice(0, whereIdx);
  const existing = aggExpression.slice(whereIdx + ' WHERE '.length);
  return `${head} WHERE (${existing}) AND (${where})`;
};
