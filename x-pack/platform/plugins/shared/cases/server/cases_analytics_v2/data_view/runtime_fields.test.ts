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
  it('maps keyword to a keyword runtime field — flattened sub-keys are not discoverable on their own', () => {
    // Regression guard: under the `flattened` mapping for
    // `cases.extended_fields`, sub-keys are queryable in ES but invisible
    // to Kibana's data-view field list. Returning `null` here (the prior
    // behaviour) silently dropped every `keyword`-typed template field
    // from Discover / Lens / Stack Management. Lifting them through a
    // keyword runtime field at `cases.<name>_as_keyword` is the only
    // path that surfaces the value.
    expect(suffixToRuntimeType('keyword')).toBe('keyword');
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
    // ES docs explicitly prescribe `doc[parent.subkey]` (not `_source`) for
    // sub-keys of `flattened` — flattened sub-keys ARE doc-values-backed
    // through the parent. A prior `_source` walk silently returned no value
    // in synthetic-source / lookup-mode indices because `_source` is
    // reconstructed from doc values and the sub-object structure is lost.
    const src = buildPainlessSource('riskScore_as_long', 'long');
    expect(src).toContain("doc['cases.extended_fields.riskScore_as_long']");
    expect(src).toContain('vals.empty');
    expect(src).toContain('for (String v : vals)');
    // Must NOT walk _source — that pattern silently fails on synthetic source
    // and is much slower than doc-values access.
    expect(src).not.toContain('params._source');
    expect(src).not.toContain('ef.get(');
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

  it('emits the raw string for keyword without parsing', () => {
    // Flattened sub-keys are stored as keyword in ES; doc-values iteration
    // yields the raw strings directly. A keyword runtime field just lifts
    // them to a discoverable path. No try/catch needed because there is no
    // parse step.
    const src = buildPainlessSource('summary_as_keyword', 'keyword');
    expect(src).toContain("doc['cases.extended_fields.summary_as_keyword']");
    expect(src).toContain('emit(v)');
    expect(src).not.toContain('parseLong');
    expect(src).not.toContain('parseDouble');
    expect(src).not.toContain('Instant.parse');
    expect(src).not.toContain('parseBoolean');
  });

  it('iterates the doc-values list so multi-valued template fields publish every value', () => {
    // Single-valued template fields collapse to a one-element iteration;
    // multi-valued (e.g. CHECKBOX_GROUP arrays, future array support) call
    // emit once per element, which is how runtime fields publish multi-value.
    for (const type of ['long', 'double', 'date', 'boolean', 'keyword'] as const) {
      expect(buildPainlessSource('m', type)).toContain('for (String v : vals)');
    }
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
    // The published field name lives one level above the source location
    // (cases.extended_fields.<snake>) so Lens / Discover surface the typed
    // runtime field. The painless reads via `doc[...]` because flattened
    // sub-keys are doc-values-backed under the parent's value stream.
    const entry = buildRuntimeFieldEntry('riskScore_as_long');
    expect(entry).not.toBeNull();
    expect(entry!.fieldName).toBe('cases.riskScore_as_long');
    expect(entry!.spec.type).toBe('long');
    expect(entry!.spec.script?.source).toContain('Long.parseLong');
    expect(entry!.spec.script?.source).toContain("doc['cases.extended_fields.riskScore_as_long']");
  });

  it('publishes a keyword runtime field for keyword extended fields (flattened sub-keys are not discoverable)', () => {
    // Without this entry, `<name>_as_keyword` template fields are
    // invisible in Discover / Lens / Stack Management — the parent
    // `cases.extended_fields` is the only thing the data view sees.
    const entry = buildRuntimeFieldEntry('playbook_as_keyword');
    expect(entry).not.toBeNull();
    expect(entry!.fieldName).toBe('cases.playbook_as_keyword');
    expect(entry!.spec.type).toBe('keyword');
    expect(entry!.spec.script?.source).toContain(
      "doc['cases.extended_fields.playbook_as_keyword']"
    );
    expect(entry!.spec.script?.source).toMatch(/emit\(v\)/);
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
