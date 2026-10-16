/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Backslashes must be escaped before quotes so the added `\"` is not re-escaped. */
const escapeKqlValue = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/** `metadata.tags: "a" OR metadata.tags: "b"`, wrapped so it can be negated as a unit. */
const buildTagsClause = (tags: string[] | undefined): string | undefined =>
  tags && tags.length > 0
    ? `(${tags.map((tag) => `metadata.tags: "${escapeKqlValue(tag)}"`).join(' OR ')})`
    : undefined;

export const buildRulesListFilter = ({
  enabled,
  kind,
  tags,
  excludedTags,
  templateId,
}: {
  enabled?: string;
  kind?: string;
  tags?: string[];
  excludedTags?: string[];
  /** Only the rules created from the rule template with this id. */
  templateId?: string;
}) => {
  const enabledValue = enabled === 'true' ? true : enabled === 'false' ? false : undefined;
  const kindValue = kind === 'alert' || kind === 'signal' ? kind : undefined;

  const excludedTagsClause = buildTagsClause(excludedTags);

  const clauses = [
    enabledValue === undefined ? undefined : `enabled: ${enabledValue}`,
    buildTagsClause(tags),
    excludedTagsClause ? `NOT ${excludedTagsClause}` : undefined,
    kindValue ? `kind: ${kindValue}` : undefined,
    templateId ? `metadata.template.id: "${escapeKqlValue(templateId)}"` : undefined,
  ].filter((clause): clause is string => Boolean(clause));

  return clauses.length > 0 ? clauses.join(' AND ') : undefined;
};
