/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildDetectionQuery, buildPainlessScript, buildUbqBody } from '../ubq_builder';

const WATERMARK = '2026-08-09T00:00:00.000Z';

describe('buildDetectionQuery', () => {
  it('builds the combined detection query for a single field with source-field gate', () => {
    const query = buildDetectionQuery('dashboard', ['title'], WATERMARK);
    expect(query).toEqual({
      bool: {
        filter: [{ term: { type: 'dashboard' } }],
        should: [
          {
            bool: {
              should: [
                {
                  bool: {
                    filter: [{ exists: { field: 'dashboard.title' } }],
                    must_not: [{ exists: { field: 'dashboard.title_semantic' } }],
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
          { range: { updated_at: { gte: WATERMARK } } },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('includes a source-gate + must_not exists clause for every declared shadow field', () => {
    const query = buildDetectionQuery('dashboard', ['title', 'description'], WATERMARK);
    const outerBool = (query as any).bool;
    const missingBool = outerBool.should[0].bool;
    expect(missingBool.should).toHaveLength(2);
    // Each clause gates on source field existing AND shadow absent.
    expect(missingBool.should[0]).toEqual({
      bool: {
        filter: [{ exists: { field: 'dashboard.title' } }],
        must_not: [{ exists: { field: 'dashboard.title_semantic' } }],
      },
    });
    expect(missingBool.should[1]).toEqual({
      bool: {
        filter: [{ exists: { field: 'dashboard.description' } }],
        must_not: [{ exists: { field: 'dashboard.description_semantic' } }],
      },
    });
  });

  it('uses the provided watermark in the range clause', () => {
    const wm = '2025-01-01T00:00:00.000Z';
    const query = buildDetectionQuery('rule', ['name'], wm);
    const outerBool = (query as any).bool;
    expect(outerBool.should[1]).toEqual({ range: { updated_at: { gte: wm } } });
  });

  it('filters by type in the bool filter', () => {
    const query = buildDetectionQuery('myType', ['field1'], WATERMARK);
    expect((query as any).bool.filter).toEqual([{ term: { type: 'myType' } }]);
  });

  it('qualifies shadow field names as typeName.fieldName_semantic', () => {
    const query = buildDetectionQuery('lens', ['title', 'description'], WATERMARK);
    const shadows = (query as any).bool.should[0].bool.should;
    expect(shadows[0].bool.must_not[0].exists.field).toBe('lens.title_semantic');
    expect(shadows[1].bool.must_not[0].exists.field).toBe('lens.description_semantic');
    // Also verify source-field gate uses unqualified-with-type prefix.
    expect(shadows[0].bool.filter[0].exists.field).toBe('lens.title');
    expect(shadows[1].bool.filter[0].exists.field).toBe('lens.description');
  });
});

describe('buildPainlessScript', () => {
  it('generates a script for a single field with noop-on-no-change logic', () => {
    const script = buildPainlessScript('dashboard', ['title']);
    // Must reference the type namespace
    expect(script).toContain("ctx._source.get('dashboard')");
    // Must noop when type map is absent
    expect(script).toContain("ctx.op = 'noop'");
    // Must read source field
    expect(script).toContain("_t.get('title')");
    // Must check instanceof String (Painless null-safety)
    expect(script).toContain('instanceof String');
    // Must set shadow field only when value changed
    expect(script).toContain("_t['title_semantic']");
    // Must remove shadow field when source is absent/empty (only if key present)
    expect(script).toContain("_t.remove('title_semantic')");
    // Must track whether any field changed and noop if not
    expect(script).toContain('boolean _changed = false');
    expect(script).toContain("if (!_changed) { ctx.op = 'noop'; }");
  });

  it('generates assignments for every declared field', () => {
    const script = buildPainlessScript('dashboard', ['title', 'description']);
    expect(script).toContain("_t.get('title')");
    expect(script).toContain("_t['title_semantic']");
    expect(script).toContain("_t.get('description')");
    expect(script).toContain("_t['description_semantic']");
  });

  it('uses distinct Painless variable names per field to avoid collisions', () => {
    const script = buildPainlessScript('lens', ['title', 'description', 'summary']);
    // Variables _v0, _v1, _v2 must all appear
    expect(script).toContain('def _v0');
    expect(script).toContain('def _v1');
    expect(script).toContain('def _v2');
  });

  it('handles a type with a single field without syntax errors (no trailing semicolons needed)', () => {
    // Just verify it's a non-empty string with the right structure
    const script = buildPainlessScript('rule', ['name']);
    expect(script.length).toBeGreaterThan(0);
    expect(script).toContain("ctx._source.get('rule')");
  });

  it('uses bracket notation for a hyphenated type name, keeping the script well-formed', () => {
    // 'index-pattern' is a real SO type with a hyphen. The builder must use
    // single-quoted bracket notation (get('index-pattern')) so that the hyphen is
    // treated as a literal character by Painless rather than a subtraction operator.
    const script = buildPainlessScript('index-pattern', ['title']);
    // Type access must use bracket/get notation, not dot notation.
    expect(script).toContain("ctx._source.get('index-pattern')");
    // Source field accessed via bracket notation on the type map.
    expect(script).toContain("_t.get('title')");
    // Shadow field assignment uses bracket notation.
    expect(script).toContain("_t['title_semantic']");
    // Must still include noop logic.
    expect(script).toContain('boolean _changed = false');
    expect(script).toContain("if (!_changed) { ctx.op = 'noop'; }");
    // Must NOT contain dot-notation access for the type (e.g. ctx._source.index-pattern).
    expect(script).not.toContain('ctx._source.index-pattern');
  });
});

describe('buildUbqBody', () => {
  it('returns both query and script keys', () => {
    const body = buildUbqBody('dashboard', ['title', 'description'], WATERMARK);
    expect(body).toHaveProperty('query');
    expect(body).toHaveProperty('script');
    expect((body.script as any).lang).toBe('painless');
    expect(typeof (body.script as any).source).toBe('string');
  });

  it('matches the R1-proven UBQ request shape snapshot', () => {
    const body = buildUbqBody('dashboard', ['title', 'description'], WATERMARK);
    expect(body).toMatchSnapshot();
  });
});
