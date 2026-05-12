/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALL_TEMPLATE_TYPE_SUFFIXES,
  buildPainlessSource,
  buildRuntimeFieldEntry,
  splitSnakeKey,
  suffixToRuntimeType,
} from './runtime_fields';

describe('splitSnakeKey', () => {
  it('splits on the last _as_ segment', () => {
    expect(splitSnakeKey('riskScore_as_long')).toEqual({ name: 'riskScore', suffix: 'long' });
    expect(splitSnakeKey('incidentDate_as_date')).toEqual({
      name: 'incidentDate',
      suffix: 'date',
    });
  });

  it('handles names containing underscores', () => {
    expect(splitSnakeKey('risk_score_as_long')).toEqual({ name: 'risk_score', suffix: 'long' });
  });

  it('handles names containing the literal _as_ — last occurrence wins', () => {
    expect(splitSnakeKey('foo_as_bar_as_long')).toEqual({ name: 'foo_as_bar', suffix: 'long' });
  });

  it('returns null when the marker is missing', () => {
    expect(splitSnakeKey('bareName')).toBeNull();
    expect(splitSnakeKey('')).toBeNull();
  });

  it('returns null when name or suffix is empty', () => {
    expect(splitSnakeKey('_as_long')).toBeNull();
    expect(splitSnakeKey('foo_as_')).toBeNull();
  });
});

describe('suffixToRuntimeType', () => {
  it('returns null for keyword — no runtime field needed', () => {
    expect(suffixToRuntimeType('keyword')).toBeNull();
  });

  it('coerces numeric variants to long', () => {
    expect(suffixToRuntimeType('long')).toBe('long');
    expect(suffixToRuntimeType('integer')).toBe('long');
    expect(suffixToRuntimeType('short')).toBe('long');
    expect(suffixToRuntimeType('byte')).toBe('long');
    expect(suffixToRuntimeType('unsigned_long')).toBe('long');
  });

  it('coerces floating-point variants to double', () => {
    expect(suffixToRuntimeType('double')).toBe('double');
    expect(suffixToRuntimeType('float')).toBe('double');
    expect(suffixToRuntimeType('half_float')).toBe('double');
    expect(suffixToRuntimeType('scaled_float')).toBe('double');
  });

  it('maps date and boolean directly', () => {
    expect(suffixToRuntimeType('date')).toBe('date');
    expect(suffixToRuntimeType('boolean')).toBe('boolean');
  });

  it('returns undefined for unknown suffixes', () => {
    expect(suffixToRuntimeType('quux')).toBeUndefined();
  });
});

describe('buildPainlessSource', () => {
  it('reads from doc[cases.extended_fields.<snake>] with a defensive guard', () => {
    const src = buildPainlessSource('riskScore_as_long', 'long');
    expect(src).toContain("doc['cases.extended_fields.riskScore_as_long']");
    expect(src).toContain('size() == 0');
    expect(src).toContain('v.length() == 0');
  });

  it('uses Long.parseLong for long', () => {
    expect(buildPainlessSource('s', 'long')).toContain('Long.parseLong');
  });

  it('uses Double.parseDouble for double', () => {
    expect(buildPainlessSource('s', 'double')).toContain('Double.parseDouble');
  });

  it('tries Instant.parse first, then LocalDateTime for date', () => {
    const src = buildPainlessSource('d', 'date');
    expect(src).toContain('Instant.parse');
    expect(src).toContain('LocalDateTime.parse');
    expect(src).toContain('toEpochMilli');
  });

  it('uses Boolean.parseBoolean for boolean', () => {
    expect(buildPainlessSource('b', 'boolean')).toContain('Boolean.parseBoolean');
  });

  it('wraps every parse in try/catch so malformed values silently drop', () => {
    expect(buildPainlessSource('a', 'long')).toMatch(/try\s*\{[\s\S]+\}\s*catch/);
    expect(buildPainlessSource('b', 'double')).toMatch(/try\s*\{[\s\S]+\}\s*catch/);
    expect(buildPainlessSource('c', 'date')).toMatch(/try\s*\{[\s\S]+\}\s*catch/);
    expect(buildPainlessSource('d', 'boolean')).toMatch(/try\s*\{[\s\S]+\}\s*catch/);
  });
});

describe('buildRuntimeFieldEntry', () => {
  it('publishes the runtime field at top-level cases.<snake>', () => {
    // The published field name lives one level above the indexed keyword
    // (cases.extended_fields.<snake>) so Lens / Discover surface the typed
    // runtime field. The painless still reads from the indexed path.
    const entry = buildRuntimeFieldEntry('riskScore_as_long');
    expect(entry).not.toBeNull();
    expect(entry!.fieldName).toBe('cases.riskScore_as_long');
    expect(entry!.spec.type).toBe('long');
    expect(entry!.spec.script?.source).toContain('Long.parseLong');
    expect(entry!.spec.script?.source).toContain("doc['cases.extended_fields.riskScore_as_long']");
  });

  it('returns null for keyword (already keyword at index level — no runtime needed)', () => {
    expect(buildRuntimeFieldEntry('playbook_as_keyword')).toBeNull();
  });

  it('returns null for non-snake-key names', () => {
    expect(buildRuntimeFieldEntry('bareName')).toBeNull();
  });

  it('returns null for unknown suffixes', () => {
    expect(buildRuntimeFieldEntry('weird_as_quux')).toBeNull();
  });
});

describe('ALL_TEMPLATE_TYPE_SUFFIXES', () => {
  it('includes every type the template system can emit', () => {
    // Sanity check — the schema-drift collision guard test depends on this
    // list being complete. Hand-list the expected entries; if a template
    // type is added without updating runtime_fields.ts, this test fails.
    expect([...ALL_TEMPLATE_TYPE_SUFFIXES].sort()).toEqual(
      [
        'long',
        'integer',
        'short',
        'byte',
        'unsigned_long',
        'double',
        'float',
        'half_float',
        'scaled_float',
        'date',
        'boolean',
        'keyword',
      ].sort()
    );
  });
});
