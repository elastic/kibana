/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
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

  it('handles names containing the literal _as_', () => {
    // Last occurrence wins, so the suffix is correctly recovered.
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
  it('skips keyword (no runtime field needed — already keyword in index)', () => {
    expect(suffixToRuntimeType('keyword')).toBeNull();
  });

  it('maps numeric variants to long', () => {
    expect(suffixToRuntimeType('long')).toBe('long');
    expect(suffixToRuntimeType('integer')).toBe('long');
    expect(suffixToRuntimeType('short')).toBe('long');
    expect(suffixToRuntimeType('byte')).toBe('long');
    expect(suffixToRuntimeType('unsigned_long')).toBe('long');
  });

  it('maps floating-point variants to double', () => {
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
  it('emits a Long.parseLong path for long types', () => {
    const src = buildPainlessSource('riskScore_as_long', 'long');
    expect(src).toContain("doc['cases.extended_fields.riskScore_as_long']");
    expect(src).toContain('Long.parseLong');
    expect(src).toContain('emit(');
    // Defensive guard: must check size() and null/empty before parsing.
    expect(src).toContain('size() == 0');
    expect(src).toContain('v.length() == 0');
  });

  it('emits a Double.parseDouble path for double types', () => {
    const src = buildPainlessSource('confidence_as_double', 'double');
    expect(src).toContain('Double.parseDouble');
  });

  it('emits both Instant and LocalDateTime fallbacks for date types', () => {
    const src = buildPainlessSource('incidentDate_as_date', 'date');
    expect(src).toContain('Instant.parse');
    expect(src).toContain('LocalDateTime.parse');
    expect(src).toContain('toEpochMilli');
  });

  it('emits a Boolean.parseBoolean path for boolean types', () => {
    const src = buildPainlessSource('flag_as_boolean', 'boolean');
    expect(src).toContain('Boolean.parseBoolean');
  });

  it('wraps every parse in try/catch so malformed values silently drop', () => {
    expect(buildPainlessSource('a', 'long')).toMatch(/try\s*\{[\s\S]+\}\s*catch/);
    expect(buildPainlessSource('b', 'double')).toMatch(/try\s*\{[\s\S]+\}\s*catch/);
    expect(buildPainlessSource('c', 'date')).toMatch(/try\s*\{[\s\S]+\}\s*catch/);
  });
});

describe('buildRuntimeFieldEntry', () => {
  it('publishes the runtime field at the top-level cases.<snake> path', () => {
    // Why not shadow the indexed `cases.extended_fields.<snake>` keyword?
    // Kibana data views resolve a field name by merging
    // `{ ...runtime, ...mapped }` — so a runtime field at the indexed name
    // gets overwritten by the mapped keyword and Lens loses the typed
    // operators. We publish at `cases.<snake>` instead and the painless
    // reads from the indexed keyword path under the hood.
    const entry = buildRuntimeFieldEntry('riskScore_as_long');
    expect(entry).not.toBeNull();
    expect(entry!.fieldName).toBe('cases.riskScore_as_long');
    expect(entry!.spec.type).toBe('long');
    expect(entry!.spec.script?.source).toContain('Long.parseLong');
    // Painless still reads from the indexed keyword path.
    expect(entry!.spec.script?.source).toContain("doc['cases.extended_fields.riskScore_as_long']");
  });

  it('returns null for keyword (no runtime field needed)', () => {
    expect(buildRuntimeFieldEntry('playbook_as_keyword')).toBeNull();
  });

  it('returns null for non-snake-key field names', () => {
    expect(buildRuntimeFieldEntry('bareName')).toBeNull();
  });

  it('returns null for unknown suffixes', () => {
    expect(buildRuntimeFieldEntry('weird_as_quux')).toBeNull();
  });
});
