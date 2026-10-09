/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExistingQuerySummary } from './validate_ki_queries';

export const MAX_EXISTING_QUERIES_FOR_CONTEXT = 50;
const MAX_EXISTING_QUERY_DESCRIPTION_LENGTH = 200;

export function buildKIQueryGenerationUserMessage(
  target: { slug: string; description?: string },
  existingQueries: ExistingQuerySummary[] = []
): string {
  const parts: string[] = [];
  parts.push(`\`slug\`: ${target.slug}`);
  if (target.description) {
    parts.push(`\`target_description\`: ${target.description}`);
  }
  if (existingQueries.length > 0) {
    const existingQueriesContext = [...existingQueries]
      .sort((a, b) => (b.severity_score ?? 0) - (a.severity_score ?? 0))
      .slice(0, MAX_EXISTING_QUERIES_FOR_CONTEXT)
      .map((query) => ({
        ...query,
        description: query.description.slice(0, MAX_EXISTING_QUERY_DESCRIPTION_LENGTH),
      }));
    parts.push(`\`existing_queries\`:\n${JSON.stringify(existingQueriesContext)}`);
  }
  return parts.join('\n\n');
}
