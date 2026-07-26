/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const buildRulesListFilter = ({
  enabled,
  kind,
  tags,
}: {
  enabled?: string;
  kind?: string;
  tags?: string[];
}) => {
  const enabledValue = enabled === 'true' ? true : enabled === 'false' ? false : undefined;
  const kindValue = kind === 'alert' || kind === 'signal' ? kind : undefined;

  const tagClause =
    tags && tags.length > 0
      ? `(${tags
          .map((t) => `metadata.tags: "${t.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
          .join(' OR ')})`
      : undefined;

  const clauses = [
    enabledValue === undefined ? undefined : `enabled: ${enabledValue}`,
    tagClause,
    kindValue ? `kind: ${kindValue}` : undefined,
  ].filter((clause): clause is string => Boolean(clause));

  return clauses.length > 0 ? clauses.join(' AND ') : undefined;
};
