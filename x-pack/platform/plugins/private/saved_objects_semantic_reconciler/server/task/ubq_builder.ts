/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSemanticFieldName } from '@kbn/core-saved-objects-base-server-internal';

/**
 * Fully-qualified shadow field name for a given type + source field.
 * E.g. "dashboard" + "title" → "dashboard.title_semantic"
 */
const qualifiedShadowField = (typeName: string, field: string): string =>
  `${typeName}.${getSemanticFieldName(field)}`;

/**
 * Builds the boolean detection query for docs that need reconciliation:
 *   must match type
 *   AND (any shadow field absent/null while its source is present  OR  updated_at >= watermark)
 *
 * Each shadow-missing clause is paired with a source-field exists gate so that docs with
 * absent source fields (e.g. a dashboard with no description) drop out of the detection set
 * permanently rather than matching every sweep.
 *
 * A null shadow value counts as "absent" for the exists filter — confirmed by R1 spike.
 */
export const buildDetectionQuery = (
  typeName: string,
  fields: readonly string[],
  watermark: string
): Record<string, unknown> => {
  // Each clause: source field IS present AND shadow field IS absent/null.
  // Docs with absent source fields are excluded — no point re-embedding them.
  const missingShould = fields.map((field) => ({
    bool: {
      filter: [{ exists: { field: `${typeName}.${field}` } }],
      must_not: [{ exists: { field: qualifiedShadowField(typeName, field) } }],
    },
  }));

  return {
    bool: {
      filter: [{ term: { type: typeName } }],
      should: [
        // Clause 1: any shadow field absent or null
        { bool: { should: missingShould, minimum_should_match: 1 } },
        // Clause 2: doc touched since last successful sweep (catches stale embeddings)
        { range: { updated_at: { gte: watermark } } },
      ],
      minimum_should_match: 1,
    },
  };
};

/**
 * Builds the Painless script that copies source text fields into the shadow semantic fields.
 * The script:
 *   - Uses ctx._source.get(typeName) for null-safety
 *   - Handles absent shadow key (adds it)
 *   - Handles null shadow value (removes then re-adds via overwrite)
 *   - Handles empty/missing source field (removes shadow key to clean up stale data)
 *
 * Variable names are prefixed with `_v` + index to avoid Painless keyword collisions.
 * Exact approach proven in R1 spike.
 */
export const buildPainlessScript = (typeName: string, fields: readonly string[]): string => {
  const shadowField = (field: string): string => getSemanticFieldName(field);

  const lines: string[] = [];
  lines.push(`def _t = ctx._source.get('${typeName}');`);
  lines.push(`if (_t == null) { ctx.op = 'noop'; return; }`);
  // Track whether any field actually changes so we can noop unchanged docs.
  lines.push(`boolean _changed = false;`);

  fields.forEach((field, idx) => {
    const varName = `_v${idx}`;
    const shadow = shadowField(field);
    lines.push(`def ${varName} = _t.get('${field}');`);
    lines.push(
      `if (${varName} != null && ${varName} instanceof String && !((String)${varName}).isEmpty()) {`
    );
    // Source non-empty: shadow should equal source. Only write if different.
    lines.push(
      `  if (!${varName}.equals(_t.get('${shadow}'))) { _t['${shadow}'] = ${varName}; _changed = true; }`
    );
    lines.push(`} else {`);
    // Source empty/missing: shadow should be absent. Only remove if present.
    lines.push(`  if (_t.containsKey('${shadow}')) { _t.remove('${shadow}'); _changed = true; }`);
    lines.push(`}`);
  });

  // If no field changed, mark this doc as a noop so ES does not bump _version.
  lines.push(`if (!_changed) { ctx.op = 'noop'; }`);

  return lines.join(' ');
};

/**
 * Builds the complete UBQ request body (query + script) for a single type sweep.
 */
export const buildUbqBody = (
  typeName: string,
  fields: readonly string[],
  watermark: string
): Record<string, unknown> => ({
  query: buildDetectionQuery(typeName, fields, watermark),
  script: {
    lang: 'painless',
    source: buildPainlessScript(typeName, fields),
  },
});
