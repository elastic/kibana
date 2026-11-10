/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Backslashes must be escaped before quotes so the added `\"` is not re-escaped. */
const escapeKqlValue = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const buildAnyOfClause = (field: string, values: string[] | undefined): string | undefined =>
  values && values.length > 0
    ? `(${values.map((value) => `${field}: "${escapeKqlValue(value)}"`).join(' OR ')})`
    : undefined;

const negate = (clause: string | undefined): string | undefined =>
  clause ? `NOT ${clause}` : undefined;

export const buildRulesListFilter = ({
  enabled,
  kind,
  tags,
  excludedTags,
  templateIds,
  excludedTemplateIds,
}: {
  enabled?: string;
  kind?: string;
  tags?: string[];
  excludedTags?: string[];
  templateIds?: string[];
  excludedTemplateIds?: string[];
}) => {
  const enabledValue = enabled === 'true' ? true : enabled === 'false' ? false : undefined;
  const kindValue = kind === 'alert' || kind === 'signal' ? kind : undefined;

  const clauses = [
    enabledValue === undefined ? undefined : `enabled: ${enabledValue}`,
    buildAnyOfClause('metadata.tags', tags),
    negate(buildAnyOfClause('metadata.tags', excludedTags)),
    kindValue ? `kind: ${kindValue}` : undefined,
    buildAnyOfClause('metadata.template.id', templateIds),
    negate(buildAnyOfClause('metadata.template.id', excludedTemplateIds)),
  ].filter((clause): clause is string => Boolean(clause));

  return clauses.length > 0 ? clauses.join(' AND ') : undefined;
};
