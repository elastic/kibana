/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  customQueryBuilderFieldsSchema,
  securityDetectionQuery,
  securityDetectionQueryManifest,
  type CustomQueryBuilderFields,
} from './custom_query';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid shared-fragment fields. */
const minimalCommon = {
  severity: 'high' as const,
  risk_score: 73,
};

/** The example rule from rule-data-model.md "The rule object" section. */
const exampleRuleFields: CustomQueryBuilderFields = {
  severity: 'high',
  risk_score: 73,
  max_signals: 100,
  index: ['logs-*', 'winlogbeat-*'],
  query: 'process.args:/tmp/* and event.type:start',
  language: 'kuery',
  threat: [
    {
      framework: 'MITRE ATT&CK',
      tactic: {
        id: 'TA0002',
        name: 'Execution',
        reference: 'https://attack.mitre.org/tactics/TA0002/',
      },
      technique: [],
    },
  ],
  references: ['https://example.org/writeup'],
};

/** Minimal valid fields for the Custom Query type. */
const minimalFields: CustomQueryBuilderFields = {
  ...minimalCommon,
  index: ['logs-*'],
  query: 'event.type:start',
  language: 'kuery',
};

/** Factory for the QueryGenerationInput wrapper the type's generateQuery receives. */
const makeInput = (fields: CustomQueryBuilderFields) => ({
  fields,
  rule: {
    id: 'test-rule-id',
    kind: 'signal' as const,
    schedule: { every: '5m' },
    time_field: '@timestamp',
  },
});

// ---------------------------------------------------------------------------
// Schema — valid cases
// ---------------------------------------------------------------------------

describe('customQueryBuilderFieldsSchema – valid cases', () => {
  it('parses the design example rule fields without error', () => {
    const result = customQueryBuilderFieldsSchema.safeParse(exampleRuleFields);
    expect(result.success).toBe(true);
  });

  it('parses minimal required fields (no optional fragment fields)', () => {
    const result = customQueryBuilderFieldsSchema.safeParse(minimalFields);
    expect(result.success).toBe(true);
  });

  it('accepts language: lucene', () => {
    const result = customQueryBuilderFieldsSchema.safeParse({
      ...minimalFields,
      language: 'lucene',
    });
    expect(result.success).toBe(true);
  });

  it('parses an index array with up to 32 entries', () => {
    const result = customQueryBuilderFieldsSchema.safeParse({
      ...minimalFields,
      index: Array(32).fill('logs-*'),
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Schema — bound violations
// ---------------------------------------------------------------------------

describe('customQueryBuilderFieldsSchema – bound violations', () => {
  it('rejects an empty index array', () => {
    const result = customQueryBuilderFieldsSchema.safeParse({ ...minimalFields, index: [] });
    expect(result.success).toBe(false);
  });

  it('rejects an index array with more than 32 entries', () => {
    const result = customQueryBuilderFieldsSchema.safeParse({
      ...minimalFields,
      index: Array(33).fill('logs-*'),
    });
    expect(result.success).toBe(false);
  });

  it('rejects an index entry exceeding 256 characters', () => {
    const result = customQueryBuilderFieldsSchema.safeParse({
      ...minimalFields,
      index: ['x'.repeat(257)],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty query string', () => {
    const result = customQueryBuilderFieldsSchema.safeParse({ ...minimalFields, query: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a query string exceeding 8192 characters', () => {
    const result = customQueryBuilderFieldsSchema.safeParse({
      ...minimalFields,
      query: 'x'.repeat(8193),
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown language value', () => {
    const result = customQueryBuilderFieldsSchema.safeParse({
      ...minimalFields,
      language: 'esql',
    });
    expect(result.success).toBe(false);
  });

  it('rejects extra keys (strict mode)', () => {
    const result = customQueryBuilderFieldsSchema.safeParse({
      ...minimalFields,
      unknown_field: true,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateFields
// ---------------------------------------------------------------------------

describe('securityDetectionQuery.validateFields', () => {
  const fn = securityDetectionQuery.validateFields!;

  it('returns no errors for a valid non-blank query', () => {
    const errors = fn(minimalFields);
    expect(errors).toHaveLength(0);
  });

  it('returns an error when query is all whitespace (spaces)', () => {
    const errors = fn({ ...minimalFields, query: '   ' });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/blank/i);
  });

  it('returns an error when query is all whitespace (tabs and newlines)', () => {
    const errors = fn({ ...minimalFields, query: '\t\n\r ' });
    expect(errors).toHaveLength(1);
  });

  it('returns no errors for a query with leading/trailing spaces around real content', () => {
    const errors = fn({ ...minimalFields, query: '  event.type:start  ' });
    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// generateQuery — compiled-query snapshots
// ---------------------------------------------------------------------------

describe('securityDetectionQuery.generateQuery', () => {
  /**
   * Compiled-query snapshot: kuery, design example rule.
   *
   * Design (rule-execution-logic.md "security.detection.query") specifies:
   *   FROM logs-*, winlogbeat-*
   *   | WHERE KQL("""process.args:/tmp/* and event.type:start""")
   *   | LIMIT 100
   *
   * The Builder produces single-double-quoted strings ("...") rather than
   * triple-double-quoted strings ("""..."""). Both are semantically equivalent
   * ES|QL — this is a formatting divergence, not a semantic one.
   * Reported to the orchestrator per step 3.2 instructions.
   *
   * The pipe tab is '' (no indent), matching the design's example layout.
   */
  it('compiles the design example rule to the expected ES|QL (kuery)', async () => {
    const result = await securityDetectionQuery.generateQuery(makeInput(exampleRuleFields));

    expect(result.query.format).toBe('standalone');
    if (result.query.format !== 'standalone') return;

    // Snapshot of what the Builder actually emits.
    expect(result.query.breach.query).toMatchInlineSnapshot(`
      "FROM \\"logs-*\\", \\"winlogbeat-*\\"
      | WHERE KQL(\\"process.args:/tmp/* and event.type:start\\")
      | LIMIT 100"
    `);
  });

  /**
   * Compiled-query snapshot: lucene language with allow_wildcard.
   *
   * Design (rule-execution-logic.md "security.detection.query") specifies:
   *   QSTR("""...""", {"allow_wildcard": TRUE})
   *
   * The named-parameter map form is the only valid ES|QL syntax for QSTR options.
   * A binary `=` or `:` expression is rejected by Elasticsearch.
   */
  it('compiles a lucene-language rule to a QSTR query with allow_wildcard', async () => {
    const luceneFields: CustomQueryBuilderFields = {
      ...minimalFields,
      index: ['logs-*', 'winlogbeat-*'],
      query: 'process.args:/tmp/* AND event.type:start',
      language: 'lucene',
      max_signals: 100,
    };

    const result = await securityDetectionQuery.generateQuery(makeInput(luceneFields));

    expect(result.query.format).toBe('standalone');
    if (result.query.format !== 'standalone') return;

    expect(result.query.breach.query).toMatchInlineSnapshot(`
      "FROM \\"logs-*\\", \\"winlogbeat-*\\"
      | WHERE QSTR(\\"process.args:/tmp/* AND event.type:start\\", {\\"allow_wildcard\\": TRUE})
      | LIMIT 100"
    `);
  });

  /**
   * Compiled-query snapshot: absent max_signals emits no LIMIT.
   *
   * When max_signals is absent, the deployment-wide cap applies alone.
   */
  it('omits LIMIT when max_signals is absent', async () => {
    const noLimitFields: CustomQueryBuilderFields = {
      severity: 'low',
      risk_score: 21,
      index: ['filebeat-*'],
      query: 'event.action:login',
      language: 'kuery',
    };

    const result = await securityDetectionQuery.generateQuery(makeInput(noLimitFields));

    expect(result.query.format).toBe('standalone');
    if (result.query.format !== 'standalone') return;

    expect(result.query.breach.query).toMatchInlineSnapshot(`
      "FROM \\"filebeat-*\\"
      | WHERE KQL(\\"event.action:login\\")"
    `);
    expect(result.query.breach.query).not.toContain('LIMIT');
  });

  it('returns the standalone format (not composed)', async () => {
    const result = await securityDetectionQuery.generateQuery(makeInput(minimalFields));
    expect(result.query.format).toBe('standalone');
  });

  it('does not carry time_field or grouping overrides (execution-time rule contract)', async () => {
    const result = await securityDetectionQuery.generateQuery(makeInput(minimalFields));
    // An execution-time compile result must not override persisted framework fields.
    expect(result.time_field).toBeUndefined();
    expect(result.grouping).toBeUndefined();
  });

  it('uses each index in the FROM clause (quoted)', async () => {
    // Index names are emitted as quoted identifiers so the AST builder controls
    // escaping.  Verified here so a change to buildQuotedIndexSource is caught.
    const multiIndexFields: CustomQueryBuilderFields = {
      ...minimalFields,
      index: ['index-a', 'index-b', 'index-c'],
    };
    const result = await securityDetectionQuery.generateQuery(makeInput(multiIndexFields));
    if (result.query.format !== 'standalone') return;
    expect(result.query.breach.query).toContain('FROM "index-a", "index-b", "index-c"');
  });

  it('quotes index names so a pipe character cannot inject a second pipeline command', async () => {
    // Blocker 3 fix: index names must be escaped by the AST builder, not
    // emitted raw.  A user-supplied `"logs-* | LIMIT 1 | WHERE true"` would
    // otherwise produce three extra commands when emitted unquoted.
    //
    // Ref: rule-execution-logic.md "AST composition is the required pattern"
    const maliciousFields: CustomQueryBuilderFields = {
      ...minimalFields,
      index: ['logs-* | LIMIT 1 | WHERE true'],
    };
    const result = await securityDetectionQuery.generateQuery(makeInput(maliciousFields));
    if (result.query.format !== 'standalone') return;
    const compiledQuery = result.query.breach.query;
    // The injected text must appear only inside a quoted index name, not as
    // a bare pipeline command.
    expect(compiledQuery).toContain('"logs-* | LIMIT 1 | WHERE true"');
    // The query must have exactly one top-level command after FROM: the WHERE.
    const lines = compiledQuery.split('\n');
    const commandLines = lines.filter((l) => l.trim().startsWith('|'));
    // Only "| WHERE KQL(...)" — no injected LIMIT or extra WHERE.
    expect(commandLines).toHaveLength(1);
    expect(commandLines[0]).toContain('WHERE KQL');
  });

  it('places the user query inside KQL() for kuery language', async () => {
    const result = await securityDetectionQuery.generateQuery(makeInput(minimalFields));
    if (result.query.format !== 'standalone') return;
    expect(result.query.breach.query).toContain('KQL(');
    expect(result.query.breach.query).not.toContain('QSTR(');
  });

  it('places the user query inside QSTR() for lucene language', async () => {
    const luceneFields: CustomQueryBuilderFields = { ...minimalFields, language: 'lucene' };
    const result = await securityDetectionQuery.generateQuery(makeInput(luceneFields));
    if (result.query.format !== 'standalone') return;
    expect(result.query.breach.query).toContain('QSTR(');
    expect(result.query.breach.query).not.toContain('KQL(');
  });

  it('includes allow_wildcard = TRUE for lucene language', async () => {
    const luceneFields: CustomQueryBuilderFields = { ...minimalFields, language: 'lucene' };
    const result = await securityDetectionQuery.generateQuery(makeInput(luceneFields));
    if (result.query.format !== 'standalone') return;
    expect(result.query.breach.query).toContain('allow_wildcard');
  });

  it('emits LIMIT equal to max_signals when present', async () => {
    const result = await securityDetectionQuery.generateQuery(makeInput(exampleRuleFields));
    if (result.query.format !== 'standalone') return;
    expect(result.query.breach.query).toContain('| LIMIT 100');
  });
});

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

describe('securityDetectionQueryManifest', () => {
  it('declares type security.detection.query', () => {
    expect(securityDetectionQueryManifest.type).toBe('security.detection.query');
  });

  it('has currentVersion 1', () => {
    expect(securityDetectionQueryManifest.currentVersion).toBe(1);
  });

  it('has exactly one version entry (1)', () => {
    expect(Object.keys(securityDetectionQueryManifest.versions)).toEqual(['1']);
  });

  it('version 1 declares query as text sub-field', () => {
    expect(securityDetectionQueryManifest.versions[1].addedSubFieldMappings?.query).toEqual({
      type: 'text',
    });
  });

  it('version 1 includes the shared fragment sub-fields', () => {
    const mappings = securityDetectionQueryManifest.versions[1].addedSubFieldMappings ?? {};
    expect(mappings.risk_score).toEqual({ type: 'integer' });
    expect(mappings.max_signals).toEqual({ type: 'integer' });
    expect(mappings.note).toEqual({ type: 'text' });
    expect(mappings.setup).toEqual({ type: 'text' });
  });
});

// ---------------------------------------------------------------------------
// BuilderTypeDefinition shape
// ---------------------------------------------------------------------------

describe('securityDetectionQuery definition', () => {
  it('has type security.detection.query', () => {
    expect(securityDetectionQuery.type).toBe('security.detection.query');
  });

  it('pins kind to signal', () => {
    expect(securityDetectionQuery.kind).toBe('signal');
  });

  it('declares execution_time compilation', () => {
    expect(securityDetectionQuery.compilation).toBe('execution_time');
  });

  it('declares security/detection ownership', () => {
    expect(securityDetectionQuery.ownership).toEqual({
      solution: 'security',
      domain: 'detection',
    });
  });

  it('carries the manifest', () => {
    expect(securityDetectionQuery.manifest).toBe(securityDetectionQueryManifest);
  });

  it('carries a validateFields hook', () => {
    expect(typeof securityDetectionQuery.validateFields).toBe('function');
  });

  it('carries an enrichRuleEvent hook', () => {
    expect(typeof securityDetectionQuery.enrichRuleEvent).toBe('function');
  });

  it('does not carry deriveRuleFields (Custom Query has no derived framework fields)', () => {
    expect(securityDetectionQuery.deriveRuleFields).toBeUndefined();
  });
});
