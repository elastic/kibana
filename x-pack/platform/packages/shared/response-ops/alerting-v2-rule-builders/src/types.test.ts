/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  KEYWORD_SUB_FIELD_IGNORE_ABOVE,
  LUCENE_MAX_TERM_BYTES,
  MAX_UTF8_BYTES_PER_CHAR,
  mergeBuilderFieldMappings,
} from './types';
import type {
  BuilderFieldsBackfill,
  BuilderFieldsManifest,
  BuilderFieldsVersion,
  BuilderTypeDefinition,
  DerivedRuleFields,
  GeneratedQuery,
  MappingProperty,
  OpaqueBuilderFields,
  QueryGenerationInput,
  RuleEventEnrichment,
  RuleEventEnrichmentInput,
} from './types';

// ---------------------------------------------------------------------------
// Write-time fixture
//
// A minimal write_time builder type to verify the widened contract compiles
// and carries the declared properties at runtime.
// ---------------------------------------------------------------------------

interface WriteTimeFields {
  query_text: string;
}

/** Compile-time assertion: the object must satisfy BuilderTypeDefinition. */
const writeTimeDef: BuilderTypeDefinition<WriteTimeFields> = {
  type: 'test.write_time',
  name: 'Write-time test type',
  description: 'A fixture type that compiles at write time.',
  compilation: 'write_time',
  builderFieldsSchema: z.object({ query_text: z.string().max(1000) }).strict(),
  validateFields: (fields): string[] => {
    if (fields.query_text.trim().length === 0) {
      return ['query_text must not be blank'];
    }
    return [];
  },
  generateQuery: (_input: QueryGenerationInput<WriteTimeFields>): GeneratedQuery => ({
    query: { base: 'FROM logs-* | LIMIT 10' },
  }),
};

// ---------------------------------------------------------------------------
// Execution-time fixture
//
// An execution_time builder type exercising every optional property:
// validateFields, deriveRuleFields, and enrichRuleEvent.
// The run context is passed to generateQuery to verify the widened input shape.
// ---------------------------------------------------------------------------

interface ExecTimeFields {
  risk_score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/** Compile-time assertion: the object must satisfy BuilderTypeDefinition. */
const execTimeDef: BuilderTypeDefinition<ExecTimeFields> = {
  type: 'test.execution_time',
  name: 'Execution-time test type',
  compilation: 'execution_time',
  kind: 'signal',
  ownership: { solution: 'test', domain: 'fixtures' },
  builderFieldsSchema: z
    .object({
      risk_score: z.number().int().min(0).max(100),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
    })
    .strict(),
  validateFields: (fields): string[] => {
    return fields.risk_score > 100 ? ['risk_score must be <= 100'] : [];
  },
  deriveRuleFields: (_fields: ExecTimeFields): DerivedRuleFields => ({}),
  generateQuery: (input: QueryGenerationInput<ExecTimeFields>): GeneratedQuery => ({
    query: {
      // The run context is accessible; the fixture ignores it but the type must accept it.
      base: input.run
        ? `FROM logs-* | WHERE @timestamp >= "${input.run.window.start}" | LIMIT 10`
        : 'FROM logs-* | LIMIT 10',
    },
  }),
  enrichRuleEvent: (input: RuleEventEnrichmentInput<ExecTimeFields>): RuleEventEnrichment => ({
    severity: input.fields.severity,
    data: {
      'kibana.alert.risk_score': input.fields.risk_score,
      'kibana.alert.rule.rule_id': input.rule.signature_id,
    },
  }),
};

// Suppress "unused variable" linting without altering the type-check assignments.
void writeTimeDef;
void execTimeDef;

// ---------------------------------------------------------------------------
// Runtime assertions — write_time fixture
// ---------------------------------------------------------------------------

describe('BuilderTypeDefinition — write_time fixture', () => {
  it('carries the expected type, name, and compilation', () => {
    expect(writeTimeDef.type).toBe('test.write_time');
    expect(writeTimeDef.name).toBe('Write-time test type');
    expect(writeTimeDef.compilation).toBe('write_time');
  });

  it('generateQuery returns a GeneratedQuery when given a QueryGenerationInput', () => {
    const input: QueryGenerationInput<WriteTimeFields> = {
      fields: { query_text: 'event.type:start' },
      rule: {
        kind: 'alert',
        schedule: { every: '5m' },
        time_field: '@timestamp',
      },
    };
    const result = writeTimeDef.generateQuery(input);
    // Write-time types return synchronously; the result must not be a Promise.
    expect(result).not.toBeInstanceOf(Promise);
    expect((result as GeneratedQuery).query.base).toContain('FROM logs-*');
  });

  it('validateFields returns an error for a blank query', () => {
    const errors = writeTimeDef.validateFields!({ query_text: '   ' });
    expect(errors).toContain('query_text must not be blank');
  });

  it('validateFields returns no errors for a valid query', () => {
    const errors = writeTimeDef.validateFields!({ query_text: 'event.type:start' });
    expect(errors).toHaveLength(0);
  });

  it('has no deriveRuleFields or enrichRuleEvent (write-time does not use them)', () => {
    expect(writeTimeDef.deriveRuleFields).toBeUndefined();
    expect(writeTimeDef.enrichRuleEvent).toBeUndefined();
  });

  it('has no kind or ownership (unmanaged type)', () => {
    expect(writeTimeDef.kind).toBeUndefined();
    expect(writeTimeDef.ownership).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Runtime assertions — execution_time fixture
// ---------------------------------------------------------------------------

describe('BuilderTypeDefinition — execution_time fixture', () => {
  it('carries the expected type, compilation, kind, and ownership', () => {
    expect(execTimeDef.type).toBe('test.execution_time');
    expect(execTimeDef.compilation).toBe('execution_time');
    expect(execTimeDef.kind).toBe('signal');
    expect(execTimeDef.ownership).toEqual({ solution: 'test', domain: 'fixtures' });
  });

  it('generateQuery accepts a QueryGenerationInput without a run context', () => {
    const input: QueryGenerationInput<ExecTimeFields> = {
      fields: { risk_score: 50, severity: 'high' },
      rule: {
        id: 'rule-abc',
        kind: 'signal',
        schedule: { every: '5m', lookback: '6m' },
        time_field: '@timestamp',
      },
    };
    const result = execTimeDef.generateQuery(input);
    expect(result).not.toBeInstanceOf(Promise);
    expect((result as GeneratedQuery).query.base).toContain('FROM logs-*');
  });

  it('generateQuery accepts a QueryGenerationInput with a run context', () => {
    const input: QueryGenerationInput<ExecTimeFields> = {
      fields: { risk_score: 30, severity: 'medium' },
      rule: {
        id: 'rule-xyz',
        kind: 'signal',
        schedule: { every: '5m', lookback: '6m' },
        time_field: '@timestamp',
      },
      run: {
        now: '2024-01-01T00:00:00.000Z',
        window: { start: '2023-12-31T23:54:00.000Z', end: '2024-01-01T00:00:00.000Z' },
      },
    };
    const result = execTimeDef.generateQuery(input);
    expect(result).not.toBeInstanceOf(Promise);
    // The fixture uses window.start in the compiled query when run is present.
    const query = result as GeneratedQuery;
    expect(query.query.base).toContain('2023-12-31T23:54:00.000Z');
  });

  it('deriveRuleFields returns an empty DerivedRuleFields for the fixture', () => {
    const derived = execTimeDef.deriveRuleFields!({ risk_score: 50, severity: 'high' });
    expect(derived).toEqual({});
  });

  it('enrichRuleEvent stamps severity, risk_score, and signature_id', () => {
    const input: RuleEventEnrichmentInput<ExecTimeFields> = {
      fields: { risk_score: 75, severity: 'critical' },
      rule: { id: 'rule-abc', signature_id: 'SIG-001', kind: 'signal' },
      row: { '@timestamp': '2024-01-01T00:00:00.000Z', message: 'test' },
    };
    const enrichment = execTimeDef.enrichRuleEvent!(input);
    expect(enrichment.severity).toBe('critical');
    expect(enrichment.data?.['kibana.alert.risk_score']).toBe(75);
    expect(enrichment.data?.['kibana.alert.rule.rule_id']).toBe('SIG-001');
  });

  it('enrichRuleEvent does not mutate the row', () => {
    const row = { '@timestamp': '2024-01-01T00:00:00.000Z' };
    const input: RuleEventEnrichmentInput<ExecTimeFields> = {
      fields: { risk_score: 10, severity: 'low' },
      rule: { id: 'rule-x', signature_id: 'sig-x', kind: 'signal' },
      row,
    };
    execTimeDef.enrichRuleEvent!(input);
    // The original row object is untouched.
    expect(row).toEqual({ '@timestamp': '2024-01-01T00:00:00.000Z' });
  });
});

// ---------------------------------------------------------------------------
// MappingProperty allowlist coverage
//
// Verifies that every member of the union compiles and carries the right shape
// at runtime. The compile-time check is the primary assertion.
//
// After the redesign the union has 8 members (keyword, text, integral group,
// floating group, scaled_float, boolean, date, ip). Individual type strings are
// still 14, but they are distributed across those 8 members.
// ---------------------------------------------------------------------------

describe('MappingProperty — allowlist coverage', () => {
  const examples: MappingProperty[] = [
    // keyword requires ignore_above
    { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
    { type: 'text' },
    // integral group
    { type: 'integer' },
    { type: 'long' },
    { type: 'short' },
    { type: 'byte' },
    { type: 'unsigned_long' },
    // floating group
    { type: 'double' },
    { type: 'float' },
    { type: 'half_float' },
    { type: 'scaled_float', scaling_factor: 1000 },
    { type: 'date' },
    { type: 'ip' },
    { type: 'boolean' },
  ];

  it('contains fourteen example values covering all type strings', () => {
    expect(examples).toHaveLength(14);
  });

  it('keyword requires ignore_above and carries the ceiling constant', () => {
    const kw = examples.find((e) => e.type === 'keyword') as Extract<
      MappingProperty,
      { type: 'keyword' }
    >;
    expect(kw.ignore_above).toBe(KEYWORD_SUB_FIELD_IGNORE_ABOVE);
  });

  it('scaled_float carries the required scaling_factor', () => {
    const sf = examples.find((e) => e.type === 'scaled_float') as Extract<
      MappingProperty,
      { type: 'scaled_float' }
    >;
    expect(sf.scaling_factor).toBe(1000);
  });

  it('covers all expected type strings', () => {
    const types = examples.map((e) => e.type);
    expect(types).toContain('keyword');
    expect(types).toContain('text');
    expect(types).toContain('integer');
    expect(types).toContain('date');
    expect(types).toContain('ip');
    expect(types).toContain('boolean');
  });
});

// ---------------------------------------------------------------------------
// Keyword ceiling constants
//
// The constants are derived, not hand-typed, so the tests verify the derivation.
// ---------------------------------------------------------------------------

describe('KEYWORD_SUB_FIELD_IGNORE_ABOVE — derivation', () => {
  it('LUCENE_MAX_TERM_BYTES is 32,766', () => {
    expect(LUCENE_MAX_TERM_BYTES).toBe(32_766);
  });

  it('MAX_UTF8_BYTES_PER_CHAR is 4', () => {
    expect(MAX_UTF8_BYTES_PER_CHAR).toBe(4);
  });

  it('KEYWORD_SUB_FIELD_IGNORE_ABOVE equals Math.floor(LUCENE_MAX_TERM_BYTES / MAX_UTF8_BYTES_PER_CHAR)', () => {
    expect(KEYWORD_SUB_FIELD_IGNORE_ABOVE).toBe(
      Math.floor(LUCENE_MAX_TERM_BYTES / MAX_UTF8_BYTES_PER_CHAR)
    );
  });

  it('KEYWORD_SUB_FIELD_IGNORE_ABOVE is 8,191', () => {
    // 32,766 / 4 = 8,191.5 → floor → 8,191
    expect(KEYWORD_SUB_FIELD_IGNORE_ABOVE).toBe(8_191);
  });

  it('8,192 characters would exceed the limit (the value above the ceiling is unsafe)', () => {
    // Sanity check: 8,192 * 4 = 32,768 which exceeds 32,766.
    expect((KEYWORD_SUB_FIELD_IGNORE_ABOVE + 1) * MAX_UTF8_BYTES_PER_CHAR).toBeGreaterThan(
      LUCENE_MAX_TERM_BYTES
    );
  });
});

// ---------------------------------------------------------------------------
// mergeBuilderFieldMappings
// ---------------------------------------------------------------------------

describe('mergeBuilderFieldMappings', () => {
  it('merges two sources with no overlapping paths', () => {
    const a: Record<string, MappingProperty> = {
      risk_score: { type: 'integer' },
    };
    const b: Record<string, MappingProperty> = {
      severity: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
    };
    const merged = mergeBuilderFieldMappings(a, b);
    expect(merged).toEqual({
      risk_score: { type: 'integer' },
      severity: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
    });
  });

  it('merges identical declarations at the same path silently', () => {
    const a: Record<string, MappingProperty> = {
      index: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
      query: { type: 'text' },
    };
    const b: Record<string, MappingProperty> = {
      // Same declarations as a — must merge without throwing.
      index: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
      query: { type: 'text' },
      language: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
    };
    const merged = mergeBuilderFieldMappings(a, b);
    expect(merged).toEqual({
      index: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
      query: { type: 'text' },
      language: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
    });
  });

  it('throws when two sources declare the same path with different types, naming the path', () => {
    const a: Record<string, MappingProperty> = {
      risk_score: { type: 'integer' },
    };
    const b: Record<string, MappingProperty> = {
      risk_score: { type: 'long' },
    };
    expect(() => mergeBuilderFieldMappings(a, b)).toThrow(/risk_score/);
  });

  it('throw message names both conflicting declarations', () => {
    const a: Record<string, MappingProperty> = {
      score: { type: 'integer' },
    };
    const b: Record<string, MappingProperty> = {
      score: { type: 'double' },
    };
    let errorMessage = '';
    try {
      mergeBuilderFieldMappings(a, b);
    } catch (e) {
      errorMessage = (e as Error).message;
    }
    // Both source A and source B declarations should appear in the message.
    expect(errorMessage).toContain('integer');
    expect(errorMessage).toContain('double');
    expect(errorMessage).toContain('score');
  });

  it('throws when ignore_above differs on a keyword path', () => {
    const a: Record<string, MappingProperty> = {
      tag: { type: 'keyword', ignore_above: 256 },
    };
    const b: Record<string, MappingProperty> = {
      tag: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
    };
    expect(() => mergeBuilderFieldMappings(a, b)).toThrow(/tag/);
  });

  it('merges three sources, deduplicating identical overlapping paths across all three', () => {
    const common: Record<string, MappingProperty> = {
      severity: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
      risk_score: { type: 'integer' },
      index: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
      query: { type: 'text' },
      language: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
    };
    const queryOnly: Record<string, MappingProperty> = {
      // index, query, language are already in common — identical, must merge.
      index: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
      query: { type: 'text' },
      language: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
    };
    const thresholdOnly: Record<string, MappingProperty> = {
      // index, query, language are also in threshold — identical, must merge.
      index: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
      query: { type: 'text' },
      language: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
      'threshold.value': { type: 'integer' },
    };
    const merged = mergeBuilderFieldMappings(common, queryOnly, thresholdOnly);
    expect(merged).toEqual({
      severity: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
      risk_score: { type: 'integer' },
      index: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
      query: { type: 'text' },
      language: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
      'threshold.value': { type: 'integer' },
    });
  });

  it('returns a new object and does not mutate any source', () => {
    const a: Record<string, MappingProperty> = { risk_score: { type: 'integer' } };
    const b: Record<string, MappingProperty> = { severity: { type: 'keyword', ignore_above: 256 } };
    const merged = mergeBuilderFieldMappings(a, b);
    // The result is a distinct object.
    expect(merged).not.toBe(a);
    expect(merged).not.toBe(b);
    // Sources are unchanged.
    expect(Object.keys(a)).toEqual(['risk_score']);
    expect(Object.keys(b)).toEqual(['severity']);
  });
});

// ---------------------------------------------------------------------------
// BuilderFieldsManifest compile-time shape check
//
// A synthetic manifest asserting the three interfaces compile together and
// carry the expected runtime shapes.
// ---------------------------------------------------------------------------

describe('BuilderFieldsManifest — compile-time and runtime shape', () => {
  const backfillFn = (fields: OpaqueBuilderFields): OpaqueBuilderFields => ({
    ...fields,
    migrated: true,
  });

  const backfill: BuilderFieldsBackfill = {
    builderTypes: ['security.detection.query'],
    migrate: backfillFn,
  };

  const version1: BuilderFieldsVersion = {
    addedMappings: {
      risk_score: { type: 'integer' },
      severity: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
    },
    backfills: [backfill],
  };

  const manifest: BuilderFieldsManifest = {
    builderTypes: ['security.detection.query'],
    currentMappings: {
      risk_score: { type: 'integer' },
      severity: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
    },
    currentVersion: 1,
    versions: { 1: version1 },
  };

  it('carries the expected builderTypes', () => {
    expect(manifest.builderTypes).toEqual(['security.detection.query']);
  });

  it('carries the expected currentVersion', () => {
    expect(manifest.currentVersion).toBe(1);
  });

  it('version 1 addedMappings includes the declared sub-fields', () => {
    expect(manifest.versions[1].addedMappings).toHaveProperty('risk_score', { type: 'integer' });
    expect(manifest.versions[1].addedMappings).toHaveProperty('severity', {
      type: 'keyword',
      ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE,
    });
  });

  it('backfill migrate is callable and returns the expected shape', () => {
    const fields: OpaqueBuilderFields = { risk_score: 50 };
    const result = manifest.versions[1].backfills![0].migrate(fields);
    expect(result).toEqual({ risk_score: 50, migrated: true });
  });
});
