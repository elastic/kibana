/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  securityDetectionThreshold,
  securityDetectionThresholdManifest,
  validateThresholdFields,
  deriveThresholdRuleFields,
} from './threshold_definition';
import {
  thresholdBuilderFieldsSchema,
  type ThresholdBuilderFields,
} from './threshold_builder_fields';
import { generateThresholdQuery } from './threshold_generate_query';

// ---------------------------------------------------------------------------
// Shared fixture helpers
// ---------------------------------------------------------------------------

/** Minimal valid fields with grouping and cardinality, matching the design's worked example. */
const DESIGN_EXAMPLE_FIELDS: ThresholdBuilderFields = {
  severity: 'high',
  risk_score: 73,
  index: ['auditbeat-*'],
  query: 'event.category:authentication and event.outcome:failure',
  language: 'kuery',
  threshold: {
    field: ['user.name', 'source.ip'],
    value: 10,
    cardinality: [{ field: 'destination.ip', value: 3 }],
  },
  max_signals: 100,
};

/** Fake QueryGenerationInput wrapper around fields — the compile functions only use fields. */
const makeInput = (fields: ThresholdBuilderFields) => ({
  fields,
  rule: {
    id: 'rule-id-fixture',
    kind: 'signal' as const,
    schedule: { every: '5m' },
    time_field: '@timestamp',
  },
});

// ---------------------------------------------------------------------------
// Schema: thresholdBuilderFieldsSchema
// ---------------------------------------------------------------------------

describe('thresholdBuilderFieldsSchema', () => {
  const base: ThresholdBuilderFields = {
    severity: 'high',
    risk_score: 73,
    index: ['logs-*'],
    query: 'error',
    language: 'kuery',
    threshold: { field: ['user.name'], value: 5 },
  };

  it('parses a minimal valid payload (no optional fields)', () => {
    const result = thresholdBuilderFieldsSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it('parses with an empty threshold.field (match-all grouping)', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({
      ...base,
      threshold: { field: [], value: 5 },
    });
    expect(result.success).toBe(true);
  });

  it('parses with an empty query (match-all pre-filter)', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({ ...base, query: '' });
    expect(result.success).toBe(true);
  });

  it('parses with cardinality present', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({
      ...base,
      threshold: {
        field: ['user.name'],
        value: 5,
        cardinality: [{ field: 'source.ip', value: 3 }],
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a query exceeding 8192 characters', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({ ...base, query: 'x'.repeat(8193) });
    expect(result.success).toBe(false);
  });

  it('rejects a threshold.field array exceeding 5 entries', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({
      ...base,
      threshold: { field: ['a', 'b', 'c', 'd', 'e', 'f'], value: 5 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a cardinality array with more than 1 entry (design caps at 1)', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({
      ...base,
      threshold: {
        field: ['user.name'],
        value: 5,
        cardinality: [
          { field: 'source.ip', value: 3 },
          { field: 'dest.ip', value: 1 },
        ],
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a threshold.value of 0', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({
      ...base,
      threshold: { field: ['user.name'], value: 0 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects extra keys at the top level (strict)', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({ ...base, unknown: true });
    expect(result.success).toBe(false);
  });

  it('rejects extra keys inside threshold (strict)', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({
      ...base,
      threshold: { field: ['user.name'], value: 5, extra: true },
    });
    expect(result.success).toBe(false);
  });

  it('accepts lucene as language', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({ ...base, language: 'lucene' });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown language value', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({ ...base, language: 'kql' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateFields
// ---------------------------------------------------------------------------

describe('validateThresholdFields', () => {
  it('returns an empty array when no cardinality is present', () => {
    const fields: ThresholdBuilderFields = {
      severity: 'medium',
      risk_score: 50,
      index: ['logs-*'],
      query: 'error',
      language: 'kuery',
      threshold: { field: ['user.name', 'source.ip'], value: 5 },
    };
    expect(validateThresholdFields(fields)).toEqual([]);
  });

  it('returns an empty array when cardinality.field is not in threshold.field', () => {
    const fields: ThresholdBuilderFields = {
      severity: 'medium',
      risk_score: 50,
      index: ['logs-*'],
      query: 'error',
      language: 'kuery',
      threshold: {
        field: ['user.name'],
        value: 5,
        cardinality: [{ field: 'destination.ip', value: 3 }],
      },
    };
    expect(validateThresholdFields(fields)).toEqual([]);
  });

  it('returns an error when cardinality.field is also in threshold.field', () => {
    const fields: ThresholdBuilderFields = {
      severity: 'medium',
      risk_score: 50,
      index: ['logs-*'],
      query: 'error',
      language: 'kuery',
      threshold: {
        field: ['user.name', 'source.ip'],
        value: 5,
        cardinality: [{ field: 'user.name', value: 3 }],
      },
    };
    const errors = validateThresholdFields(fields);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/cardinality\.field.*user\.name.*threshold\.field/i);
  });

  it('returns an empty array when threshold.field is empty (no grouping) and cardinality is present', () => {
    // When there are no grouping fields, cardinality.field cannot overlap, so no error.
    const fields: ThresholdBuilderFields = {
      severity: 'medium',
      risk_score: 50,
      index: ['logs-*'],
      query: 'error',
      language: 'kuery',
      threshold: {
        field: [],
        value: 5,
        cardinality: [{ field: 'source.ip', value: 3 }],
      },
    };
    expect(validateThresholdFields(fields)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// deriveRuleFields
// ---------------------------------------------------------------------------

describe('deriveThresholdRuleFields', () => {
  it('maps threshold.field to grouping.fields', () => {
    const fields: ThresholdBuilderFields = {
      severity: 'high',
      risk_score: 73,
      index: ['logs-*'],
      query: '',
      language: 'kuery',
      threshold: { field: ['user.name', 'source.ip'], value: 5 },
    };
    const derived = deriveThresholdRuleFields(fields);
    expect(derived).toEqual({ grouping: { fields: ['user.name', 'source.ip'] } });
  });

  it('returns grouping.fields as [] when threshold.field is empty', () => {
    const fields: ThresholdBuilderFields = {
      severity: 'high',
      risk_score: 73,
      index: ['logs-*'],
      query: '',
      language: 'kuery',
      threshold: { field: [], value: 5 },
    };
    const derived = deriveThresholdRuleFields(fields);
    expect(derived).toEqual({ grouping: { fields: [] } });
  });

  it('does not set time_field (threshold does not derive it)', () => {
    const fields: ThresholdBuilderFields = {
      severity: 'high',
      risk_score: 73,
      index: ['logs-*'],
      query: '',
      language: 'kuery',
      threshold: { field: ['host.name'], value: 3 },
    };
    const derived = deriveThresholdRuleFields(fields);
    expect(derived.time_field).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// generateQuery — compiled query snapshots
//
// These tests pin the exact ES|QL text the Builder produces.  The design's
// worked example (rule-execution-logic.md "security.detection.threshold")
// shows triple-quoted string literals (e.g. KQL("""...""")), but the
// @elastic/esql Builder always emits double-quoted string literals
// (e.g. KQL("...")).  Both are semantically identical in ES|QL.  The
// deviation is noted in the implementation report as a documentation
// convention difference, not a functional bug.
// ---------------------------------------------------------------------------

describe('generateThresholdQuery — compiled query snapshots', () => {
  // ----- design's worked example -------------------------------------------

  it("matches the design's worked example (character-by-character comparison)", () => {
    const result = generateThresholdQuery(makeInput(DESIGN_EXAMPLE_FIELDS));
    expect(result.query.format).toBe('standalone');
    if (result.query.format !== 'standalone') return;

    // The design example from rule-execution-logic.md "security.detection.threshold".
    // Note: the design shows triple-quoted KQL string ("""...""") but the Builder
    // emits double-quoted ("...").  The implementation pins the Builder's output;
    // the discrepancy is reported to the team.
    expect(result.query.breach.query).toMatchInlineSnapshot(`
      "FROM \\"auditbeat-*\\"
      | WHERE KQL(\\"event.category:authentication and event.outcome:failure\\")
      | WHERE \`user.name\` IS NOT NULL AND \`source.ip\` IS NOT NULL
      | STATS threshold_count = COUNT(*), cardinality_count = COUNT_DISTINCT(\`destination.ip\`) BY \`user.name\`, \`source.ip\`
      | WHERE threshold_count >= 10 AND cardinality_count >= 3
      | LIMIT 100"
    `);
  });

  it('does not carry grouping or time_field overrides (execution-time constraint)', () => {
    const result = generateThresholdQuery(makeInput(DESIGN_EXAMPLE_FIELDS));
    expect(result.grouping).toBeUndefined();
    expect(result.time_field).toBeUndefined();
  });

  // ----- empty query (match-all pre-filter) ----------------------------------

  it('emits no WHERE filter when query is empty', () => {
    const fields: ThresholdBuilderFields = {
      ...DESIGN_EXAMPLE_FIELDS,
      query: '',
      threshold: { field: ['host.name'], value: 5, cardinality: undefined },
      max_signals: 200,
    };
    const result = generateThresholdQuery(makeInput(fields));
    if (result.query.format !== 'standalone') throw new Error('expected standalone');
    expect(result.query.breach.query).toMatchInlineSnapshot(`
      "FROM \\"auditbeat-*\\"
      | WHERE \`host.name\` IS NOT NULL
      | STATS threshold_count = COUNT(*) BY \`host.name\`
      | WHERE threshold_count >= 5
      | LIMIT 200"
    `);
  });

  // ----- no cardinality -------------------------------------------------------

  it('emits no COUNT_DISTINCT or cardinality WHERE clause when cardinality is absent', () => {
    const fields: ThresholdBuilderFields = {
      severity: 'medium',
      risk_score: 50,
      index: ['logs-*'],
      query: 'error',
      language: 'kuery',
      threshold: { field: ['user.name'], value: 3 },
      max_signals: 100,
    };
    const result = generateThresholdQuery(makeInput(fields));
    if (result.query.format !== 'standalone') throw new Error('expected standalone');
    expect(result.query.breach.query).toMatchInlineSnapshot(`
      "FROM \\"logs-*\\"
      | WHERE KQL(\\"error\\")
      | WHERE \`user.name\` IS NOT NULL
      | STATS threshold_count = COUNT(*) BY \`user.name\`
      | WHERE threshold_count >= 3
      | LIMIT 100"
    `);
  });

  // ----- empty threshold.field (no grouping) ----------------------------------

  it('emits no IS NOT NULL guards and no BY clause when threshold.field is empty', () => {
    const fields: ThresholdBuilderFields = {
      severity: 'low',
      risk_score: 21,
      index: ['logs-*'],
      query: 'error',
      language: 'kuery',
      threshold: { field: [], value: 5 },
      max_signals: 100,
    };
    const result = generateThresholdQuery(makeInput(fields));
    if (result.query.format !== 'standalone') throw new Error('expected standalone');
    expect(result.query.breach.query).toMatchInlineSnapshot(`
      "FROM \\"logs-*\\"
      | WHERE KQL(\\"error\\")
      | STATS threshold_count = COUNT(*)
      | WHERE threshold_count >= 5
      | LIMIT 100"
    `);
  });

  // ----- empty threshold.field with cardinality --------------------------------

  it('emits COUNT_DISTINCT but no BY clause and no IS NOT NULL guards when field is empty', () => {
    const fields: ThresholdBuilderFields = {
      severity: 'low',
      risk_score: 21,
      index: ['logs-*'],
      query: 'error',
      language: 'kuery',
      threshold: { field: [], value: 5, cardinality: [{ field: 'source.ip', value: 3 }] },
      max_signals: 100,
    };
    const result = generateThresholdQuery(makeInput(fields));
    if (result.query.format !== 'standalone') throw new Error('expected standalone');
    expect(result.query.breach.query).toMatchInlineSnapshot(`
      "FROM \\"logs-*\\"
      | WHERE KQL(\\"error\\")
      | STATS threshold_count = COUNT(*), cardinality_count = COUNT_DISTINCT(\`source.ip\`)
      | WHERE threshold_count >= 5 AND cardinality_count >= 3
      | LIMIT 100"
    `);
  });

  // ----- absent max_signals ---------------------------------------------------

  it('emits no LIMIT when max_signals is absent', () => {
    const fields: ThresholdBuilderFields = {
      severity: 'medium',
      risk_score: 50,
      index: ['logs-*'],
      query: 'error',
      language: 'kuery',
      threshold: { field: ['user.name'], value: 3 },
      // max_signals absent
    };
    const result = generateThresholdQuery(makeInput(fields));
    if (result.query.format !== 'standalone') throw new Error('expected standalone');
    expect(result.query.breach.query).toMatchInlineSnapshot(`
      "FROM \\"logs-*\\"
      | WHERE KQL(\\"error\\")
      | WHERE \`user.name\` IS NOT NULL
      | STATS threshold_count = COUNT(*) BY \`user.name\`
      | WHERE threshold_count >= 3"
    `);
  });

  // ----- lucene language (QSTR) -----------------------------------------------

  it('uses QSTR(allow_wildcard: true) when language is lucene', () => {
    const fields: ThresholdBuilderFields = {
      severity: 'medium',
      risk_score: 50,
      index: ['logs-*'],
      query: 'error message:*timeout*',
      language: 'lucene',
      threshold: { field: ['host.name'], value: 5 },
      max_signals: 100,
    };
    const result = generateThresholdQuery(makeInput(fields));
    if (result.query.format !== 'standalone') throw new Error('expected standalone');
    expect(result.query.breach.query).toMatchInlineSnapshot(`
      "FROM \\"logs-*\\"
      | WHERE QSTR(\\"error message:*timeout*\\", {\\"allow_wildcard\\": TRUE})
      | WHERE \`host.name\` IS NOT NULL
      | STATS threshold_count = COUNT(*) BY \`host.name\`
      | WHERE threshold_count >= 5
      | LIMIT 100"
    `);
  });

  // ----- multiple indices -----------------------------------------------------

  it('joins multiple index patterns in the FROM clause', () => {
    const fields: ThresholdBuilderFields = {
      severity: 'medium',
      risk_score: 50,
      index: ['logs-*', 'auditbeat-*'],
      query: 'error',
      language: 'kuery',
      threshold: { field: ['user.name'], value: 5 },
      max_signals: 100,
    };
    const result = generateThresholdQuery(makeInput(fields));
    if (result.query.format !== 'standalone') throw new Error('expected standalone');
    // Index names are quoted (buildQuotedIndexSource) so the AST builder controls escaping.
    expect(result.query.breach.query.startsWith('FROM "logs-*", "auditbeat-*"')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// securityDetectionThreshold — full definition shape
// ---------------------------------------------------------------------------

describe('securityDetectionThreshold definition', () => {
  it('has the correct type id', () => {
    expect(securityDetectionThreshold.type).toBe('security.detection.threshold');
  });

  it('pins kind to signal', () => {
    expect(securityDetectionThreshold.kind).toBe('signal');
  });

  it('declares ownership as security/detection', () => {
    expect(securityDetectionThreshold.ownership).toEqual({
      solution: 'security',
      domain: 'detection',
    });
  });

  it('declares compilation as execution_time', () => {
    expect(securityDetectionThreshold.compilation).toBe('execution_time');
  });

  it('has a manifest', () => {
    expect(securityDetectionThreshold.manifest).toBeDefined();
  });

  it('has validateFields set', () => {
    expect(securityDetectionThreshold.validateFields).toBeDefined();
  });

  it('has deriveRuleFields set', () => {
    expect(securityDetectionThreshold.deriveRuleFields).toBeDefined();
  });

  it('has generateQuery set', () => {
    expect(securityDetectionThreshold.generateQuery).toBeDefined();
  });

  it('has enrichRuleEvent set', () => {
    expect(securityDetectionThreshold.enrichRuleEvent).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Manifest shape
// ---------------------------------------------------------------------------

describe('securityDetectionThresholdManifest', () => {
  it('has the correct type', () => {
    expect(securityDetectionThresholdManifest.type).toBe('security.detection.threshold');
  });

  it('is at version 1', () => {
    expect(securityDetectionThresholdManifest.currentVersion).toBe(1);
    expect(Object.keys(securityDetectionThresholdManifest.versions)).toHaveLength(1);
    expect(securityDetectionThresholdManifest.versions[1]).toBeDefined();
  });

  it('declares risk_score as integer sub-field in version 1', () => {
    expect(
      securityDetectionThresholdManifest.versions[1].addedSubFieldMappings?.risk_score
    ).toEqual({ type: 'integer' });
  });

  it('declares max_signals as integer sub-field in version 1', () => {
    expect(
      securityDetectionThresholdManifest.versions[1].addedSubFieldMappings?.max_signals
    ).toEqual({ type: 'integer' });
  });

  it('declares note as text sub-field in version 1', () => {
    expect(securityDetectionThresholdManifest.versions[1].addedSubFieldMappings?.note).toEqual({
      type: 'text',
    });
  });

  it('declares setup as text sub-field in version 1', () => {
    expect(securityDetectionThresholdManifest.versions[1].addedSubFieldMappings?.setup).toEqual({
      type: 'text',
    });
  });

  it('declares query as text sub-field in version 1', () => {
    expect(securityDetectionThresholdManifest.versions[1].addedSubFieldMappings?.query).toEqual({
      type: 'text',
    });
  });

  it('has no backfillFn in version 1 (first version, no migration needed)', () => {
    expect(securityDetectionThresholdManifest.versions[1].backfillFn).toBeUndefined();
  });
});
