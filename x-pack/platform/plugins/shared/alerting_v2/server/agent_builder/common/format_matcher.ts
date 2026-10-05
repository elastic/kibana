/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Accepts the stored shape too, where a field cleared before the API dropped `null` is still `null`. */
export const formatMatcher = (matcher: {
  tags?: string[] | null;
  expression?: string | null;
}): string => {
  const parts: string[] = [];
  if (matcher.tags?.length) parts.push(`tags: ${matcher.tags.join(', ')}`);
  if (matcher.expression?.trim()) parts.push(`expression: "${matcher.expression.trim()}"`);
  return parts.join(' AND ') || '{}';
};
