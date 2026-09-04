/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const FENCE_OPEN = /^```(?:html|HTML)?\s*\n?/;
const FENCE_CLOSE = /\n?```\s*$/;
const FENCE_MARKER = /```(?:html|HTML)?/g;
const FENCE_EDGE_WINDOW = 200;

export function stripMarkdownFences(raw: string): string {
  const trimmed = raw.trim().replace(FENCE_OPEN, '').replace(FENCE_CLOSE, '');
  return trimmed
    .replace(FENCE_MARKER, (match, offset: number) => {
      const distanceFromEdge = Math.min(offset, trimmed.length - offset - match.length);
      return distanceFromEdge <= FENCE_EDGE_WINDOW ? '' : match;
    })
    .trim();
}
