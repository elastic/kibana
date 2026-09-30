/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  KEYWORD_SUB_FIELD_IGNORE_ABOVE,
  type BuilderFieldsManifest,
} from '@kbn/alerting-v2-rule-builders';
import { detectionRuleBuilderFieldsManifest } from '@kbn/security-detection-rule-builder-fields';
import type { RegisteredBuilderType } from '@kbn/alerting-v2-rule-builders';
import { assertValidDefinition } from './assert_valid_definition';
import { FoldedVersionsSet } from './folded_versions';
import type { FoldedVersionsRecord } from './folded_versions';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const simpleSchema = z.object({ value: z.string().max(100) }).strict();

const makeQuery = (): import('@kbn/alerting-v2-rule-builders').GeneratedQuery => ({
  query: { base: 'FROM logs-* | LIMIT 10' },
});

/**
 * A FoldedVersionsRecord that considers every (type, version) pair as folded
 * but returns no manifest for any type (total-mapping check is skipped).
 */
const allFolded: FoldedVersionsRecord = {
  has: () => true,
  hasManifestVersion: () => true,
  getManifestForType: () => undefined,
};

/** Builds a minimal valid definition; overrides narrow specific properties. */
function makeDefinition(overrides: Partial<RegisteredBuilderType> = {}): RegisteredBuilderType {
  return {
    type: 'test.my_type',
    name: 'Test type',
    builderFieldsSchema: simpleSchema as unknown as RegisteredBuilderType['builderFieldsSchema'],
    generateQuery: jest.fn(() => makeQuery()),
    ...overrides,
  };
}

/** Shorthand: expect assertValidDefinition not to throw. */
function passes(
  definition: Partial<RegisteredBuilderType>,
  foldedVersions: FoldedVersionsRecord = allFolded
): void {
  expect(() => assertValidDefinition(makeDefinition(definition), foldedVersions)).not.toThrow();
}

/** Shorthand: expect assertValidDefinition to throw with a matching message. */
function rejects(
  definition: Partial<RegisteredBuilderType>,
  match: string | RegExp,
  foldedVersions: FoldedVersionsRecord = allFolded
): void {
  expect(() => assertValidDefinition(makeDefinition(definition), foldedVersions)).toThrow(match);
}

// ---------------------------------------------------------------------------
// Helper: build a FoldedVersionsRecord with a manifest that covers a type.
// The manifest's currentMappings must include every leaf that simpleSchema
// produces (i.e. 'value' as keyword) so that the total-mapping check passes
// for tests that focus on other checks.
// ---------------------------------------------------------------------------

function makeManifestFor(
  type: string,
  extraMappings: Record<string, BuilderFieldsManifest['currentMappings'][string]> = {}
): BuilderFieldsManifest {
  const valueMapping = { type: 'keyword' as const, ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE };
  return {
    builderTypes: [type],
    currentMappings: { value: valueMapping, ...extraMappings },
    currentVersion: 1,
    versions: { 1: { addedMappings: { value: valueMapping, ...extraMappings } } },
  };
}

function makeManifestFolded(
  type: string,
  extraMappings: Record<string, BuilderFieldsManifest['currentMappings'][string]> = {}
): FoldedVersionsRecord {
  const set = new FoldedVersionsSet();
  set.recordManifest(makeManifestFor(type, extraMappings), 1);
  return set;
}

// ---------------------------------------------------------------------------
// Prerequisites (structural guards — not one of the eight designed checks)
// ---------------------------------------------------------------------------

describe('assertValidDefinition — prerequisites', () => {
  it('accepts a valid minimal definition', () => {
    passes({});
  });

  it('rejects an empty type string', () => {
    rejects({ type: '' }, 'Builder type definition requires a non-empty type');
  });

  it('rejects a null builderFieldsSchema', () => {
    rejects({ builderFieldsSchema: null as never }, 'requires a builderFieldsSchema');
  });

  it('rejects a non-function generateQuery', () => {
    rejects({ generateQuery: 'not-a-function' as never }, 'requires a generateQuery function');
  });

  // Kind-pin value check is a structural guard (not one of the eight).
  it('accepts a definition with no kind (absent = any kind allowed)', () => {
    passes({});
  });

  it('accepts kind: "alert"', () => {
    passes({ kind: 'alert' });
  });

  it('accepts kind: "signal"', () => {
    passes({ kind: 'signal' });
  });

  it('rejects an unrecognised kind value', () => {
    rejects({ kind: 'unknown' as never }, /kind pin validity check/);
  });
});

// ---------------------------------------------------------------------------
// Check 2: id format
// ---------------------------------------------------------------------------

describe('assertValidDefinition — check 2: id format', () => {
  it('accepts a valid single-segment id', () => {
    passes({ type: 'mytype' });
  });

  it('accepts a valid dot-separated id', () => {
    passes({ type: 'security.detection.query' });
  });

  it('accepts an id with underscores', () => {
    passes({ type: 'my_solution.my_domain.my_type' });
  });

  it('accepts an id with digits', () => {
    passes({ type: 'solution123.domain456.type789' });
  });

  it('accepts an id of exactly 64 characters', () => {
    // 63 chars of 'a' + '.' + 'b' = 65 — too long; use 32+1+31=64.
    passes({ type: `${'a'.repeat(32)}.${'b'.repeat(31)}` });
  });

  it('rejects an id that exceeds 64 characters', () => {
    rejects({ type: 'a'.repeat(65) }, /id format check/);
  });

  it('rejects an id with uppercase letters', () => {
    rejects({ type: 'Security.Detection.Query' }, /id format check/);
  });

  it('rejects an id with a hyphen', () => {
    rejects({ type: 'security.detection-query' }, /id format check/);
  });

  it('rejects an id that starts with a dot', () => {
    rejects({ type: '.security.detection' }, /id format check/);
  });

  it('rejects an id that ends with a dot', () => {
    rejects({ type: 'security.detection.' }, /id format check/);
  });

  it('rejects an id with consecutive dots', () => {
    rejects({ type: 'security..detection' }, /id format check/);
  });

  it('rejects an id with a space', () => {
    rejects({ type: 'security detection' }, /id format check/);
  });
});

// ---------------------------------------------------------------------------
// Check 3: bounded schema
//
// The bounded-schema checks live in assert_bounded_schema.test.ts.
// Here we just verify the check is run and its rejection surfaces from
// assertValidDefinition.
// ---------------------------------------------------------------------------

describe('assertValidDefinition — check 3: bounded schema (delegation smoke test)', () => {
  it('rejects an unbounded schema (string without .max())', () => {
    const unbounded = z.object({ name: z.string() }).strict();
    rejects(
      { builderFieldsSchema: unbounded as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      /string is missing maxLength/
    );
  });

  it('rejects a schema with .default()', () => {
    const withDefault = z.object({ val: z.string().max(10).default('x') }).strict();
    rejects(
      {
        builderFieldsSchema: withDefault as unknown as RegisteredBuilderType['builderFieldsSchema'],
      },
      /default/
    );
  });

  it('rejects a schema with .transform()', () => {
    const withTransform = z
      .object({
        val: z
          .string()
          .max(10)
          .transform((x) => x.toUpperCase()),
      })
      .strict();
    rejects(
      {
        builderFieldsSchema:
          withTransform as unknown as RegisteredBuilderType['builderFieldsSchema'],
      },
      /transform/
    );
  });
});

// ---------------------------------------------------------------------------
// Check 6: total mapping
// ---------------------------------------------------------------------------

describe('assertValidDefinition — check 6: total mapping', () => {
  // Helper: make a FoldedVersionsRecord with a manifest covering 'test.my_type'
  // and the given currentMappings (value is always included to satisfy simpleSchema).
  function withMappings(
    mappings: Record<string, BuilderFieldsManifest['currentMappings'][string]>
  ): FoldedVersionsRecord {
    return makeManifestFolded('test.my_type', mappings);
  }

  // ---------------------------------------------------------------------------
  // Unmapped leaf / extra mapped leaf (the one-way check)
  // ---------------------------------------------------------------------------

  it('rejects a type when a schema leaf has no sub-field declaration', () => {
    // simpleSchema has 'value' (string). The manifest covers 'test.my_type' but
    // omits 'value' from its currentMappings — should fail.
    const set = new FoldedVersionsSet();
    const manifest: BuilderFieldsManifest = {
      builderTypes: ['test.my_type'],
      currentMappings: {
        other_field: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
      },
      currentVersion: 1,
      versions: {
        1: {
          addedMappings: {
            other_field: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
          },
        },
      },
    };
    set.recordManifest(manifest, 1);
    rejects({}, /total mapping check/, set);
  });

  it('accepts when a manifest sub-field has no schema leaf behind it (abandoned field)', () => {
    // simpleSchema produces 'value'. Manifest declares 'value' AND 'old_field'.
    // 'old_field' has no schema leaf — that is fine (it is an abandoned field).
    const folded = withMappings({
      old_field: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
    });
    passes({}, folded);
  });

  it('skips total mapping when no manifest covers the type (unmanaged type)', () => {
    // allFolded.getManifestForType returns undefined, so the check is skipped.
    passes({}, allFolded);
  });

  // ---------------------------------------------------------------------------
  // Compatibility table — string leaf
  // ---------------------------------------------------------------------------

  it('accepts string leaf against keyword sub-field', () => {
    const schema = z.object({ f: z.string().max(100) }).strict();
    const folded = withMappings({
      f: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
    });
    passes(
      { builderFieldsSchema: schema as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      folded
    );
  });

  it('accepts string leaf against text sub-field', () => {
    const schema = z.object({ f: z.string().max(100) }).strict();
    const folded = withMappings({ f: { type: 'text' } });
    passes(
      { builderFieldsSchema: schema as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      folded
    );
  });

  it('accepts string leaf against ip sub-field', () => {
    const schema = z.object({ f: z.string().max(100) }).strict();
    const folded = withMappings({ f: { type: 'ip' } });
    passes(
      { builderFieldsSchema: schema as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      folded
    );
  });

  it('accepts string leaf against date sub-field', () => {
    const schema = z.object({ f: z.string().max(100) }).strict();
    const folded = withMappings({ f: { type: 'date' } });
    passes(
      { builderFieldsSchema: schema as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      folded
    );
  });

  it('rejects string leaf against integer sub-field', () => {
    const schema = z.object({ f: z.string().max(100) }).strict();
    const folded = withMappings({ f: { type: 'integer' } });
    rejects(
      { builderFieldsSchema: schema as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      /total mapping check/,
      folded
    );
  });

  // ---------------------------------------------------------------------------
  // Compatibility table — integer leaf
  // ---------------------------------------------------------------------------

  it('accepts integer leaf against integer sub-field', () => {
    const schema = z.object({ f: z.number().int() }).strict();
    const folded = withMappings({ f: { type: 'integer' } });
    passes(
      { builderFieldsSchema: schema as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      folded
    );
  });

  it('accepts integer leaf against long sub-field', () => {
    const schema = z.object({ f: z.number().int() }).strict();
    const folded = withMappings({ f: { type: 'long' } });
    passes(
      { builderFieldsSchema: schema as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      folded
    );
  });

  it('accepts integer leaf against short sub-field', () => {
    const schema = z.object({ f: z.number().int() }).strict();
    const folded = withMappings({ f: { type: 'short' } });
    passes(
      { builderFieldsSchema: schema as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      folded
    );
  });

  it('accepts integer leaf against byte sub-field', () => {
    const schema = z.object({ f: z.number().int() }).strict();
    const folded = withMappings({ f: { type: 'byte' } });
    passes(
      { builderFieldsSchema: schema as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      folded
    );
  });

  it('accepts integer leaf against unsigned_long sub-field', () => {
    const schema = z.object({ f: z.number().int() }).strict();
    const folded = withMappings({ f: { type: 'unsigned_long' } });
    passes(
      { builderFieldsSchema: schema as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      folded
    );
  });

  it('rejects integer leaf against keyword sub-field', () => {
    const schema = z.object({ f: z.number().int() }).strict();
    const folded = withMappings({
      f: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
    });
    rejects(
      { builderFieldsSchema: schema as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      /total mapping check/,
      folded
    );
  });

  // ---------------------------------------------------------------------------
  // Compatibility table — number leaf
  // ---------------------------------------------------------------------------

  it('accepts number leaf against double sub-field', () => {
    const schema = z.object({ f: z.number() }).strict();
    const folded = withMappings({ f: { type: 'double' } });
    passes(
      { builderFieldsSchema: schema as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      folded
    );
  });

  it('accepts number leaf against float sub-field', () => {
    const schema = z.object({ f: z.number() }).strict();
    const folded = withMappings({ f: { type: 'float' } });
    passes(
      { builderFieldsSchema: schema as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      folded
    );
  });

  it('accepts number leaf against half_float sub-field', () => {
    const schema = z.object({ f: z.number() }).strict();
    const folded = withMappings({ f: { type: 'half_float' } });
    passes(
      { builderFieldsSchema: schema as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      folded
    );
  });

  it('accepts number leaf against scaled_float sub-field', () => {
    const schema = z.object({ f: z.number() }).strict();
    const folded = withMappings({ f: { type: 'scaled_float', scaling_factor: 100 } });
    passes(
      { builderFieldsSchema: schema as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      folded
    );
  });

  it('rejects number leaf against keyword sub-field', () => {
    const schema = z.object({ f: z.number() }).strict();
    const folded = withMappings({
      f: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
    });
    rejects(
      { builderFieldsSchema: schema as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      /total mapping check/,
      folded
    );
  });

  // ---------------------------------------------------------------------------
  // Compatibility table — boolean leaf
  // ---------------------------------------------------------------------------

  it('accepts boolean leaf against boolean sub-field', () => {
    const schema = z.object({ f: z.boolean() }).strict();
    const folded = withMappings({ f: { type: 'boolean' } });
    passes(
      { builderFieldsSchema: schema as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      folded
    );
  });

  it('rejects boolean leaf against keyword sub-field', () => {
    const schema = z.object({ f: z.boolean() }).strict();
    const folded = withMappings({
      f: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
    });
    rejects(
      { builderFieldsSchema: schema as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      /total mapping check/,
      folded
    );
  });

  // ---------------------------------------------------------------------------
  // Keyword bound check
  // ---------------------------------------------------------------------------

  it('rejects a keyword-mapped string whose schema bound exceeds ignore_above', () => {
    // max(200) > ignore_above(100)
    const schema = z.object({ f: z.string().max(200) }).strict();
    const folded = withMappings({ f: { type: 'keyword', ignore_above: 100 } });
    rejects(
      { builderFieldsSchema: schema as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      /total mapping check/,
      folded
    );
  });

  it('accepts a keyword-mapped string whose schema bound equals ignore_above', () => {
    const schema = z.object({ f: z.string().max(100) }).strict();
    const folded = withMappings({ f: { type: 'keyword', ignore_above: 100 } });
    passes(
      { builderFieldsSchema: schema as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      folded
    );
  });

  it('does not check the bound for a text-mapped string (text has no length limit)', () => {
    // max(65000) is above any keyword ignore_above but well under the absolute
    // bounded-schema ceiling (MAX_BUILDER_FIELDS_STRING_LENGTH = 65536). The
    // text sub-field gets no bound comparison, so the check passes.
    const schemaUnderCeiling = z.object({ f: z.string().max(65000) }).strict();
    const folded = withMappings({ f: { type: 'text' } });
    passes(
      {
        builderFieldsSchema:
          schemaUnderCeiling as unknown as RegisteredBuilderType['builderFieldsSchema'],
      },
      folded
    );
  });

  // ---------------------------------------------------------------------------
  // Enum leaf: bound is read from the longest enum value
  // ---------------------------------------------------------------------------

  it('reads the bound of an enum string from its longest value', () => {
    // z.enum emits { type: 'string', enum: [...] } with no maxLength.
    // The longest value is 'critical' (8 chars), well under ignore_above.
    const schema = z
      .object({ severity: z.enum(['info', 'low', 'medium', 'high', 'critical']) })
      .strict();
    const folded = withMappings({
      severity: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
    });
    passes(
      { builderFieldsSchema: schema as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      folded
    );
  });

  it('rejects an enum string when its longest value exceeds the keyword ignore_above', () => {
    // 'long_value_here' is 15 chars; ignore_above is set to 10 to trigger failure.
    const schema = z.object({ f: z.enum(['short', 'long_value_here']) }).strict();
    const folded = withMappings({ f: { type: 'keyword', ignore_above: 10 } });
    rejects(
      { builderFieldsSchema: schema as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      /total mapping check/,
      folded
    );
  });

  // ---------------------------------------------------------------------------
  // Nested structures: objects, arrays, optional fields
  // ---------------------------------------------------------------------------

  it('checks leaves inside nested objects', () => {
    const schema = z.object({ outer: z.object({ inner: z.string().max(50) }).strict() }).strict();
    // Missing 'outer.inner' from manifest — should fail.
    const folded = withMappings({});
    rejects(
      { builderFieldsSchema: schema as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      /total mapping check/,
      folded
    );
  });

  it('checks leaves inside arrays (path uses dot notation, no index bracket)', () => {
    const schema = z
      .object({ items: z.array(z.object({ name: z.string().max(50) }).strict()).max(10) })
      .strict();
    // 'items.name' must be in the manifest.
    const setWithName = withMappings({
      'items.name': { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
    });
    passes(
      { builderFieldsSchema: schema as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      setWithName
    );
  });

  it('checks leaves inside optional fields (anyOf branches)', () => {
    const schema = z.object({ f: z.string().max(50).optional() }).strict();
    const folded = withMappings({
      f: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
    });
    passes(
      { builderFieldsSchema: schema as unknown as RegisteredBuilderType['builderFieldsSchema'] },
      folded
    );
  });

  // ---------------------------------------------------------------------------
  // Real manifest: both detection schemas pass total mapping against the shipped manifest.
  // Importing the real detection definitions into tests under alerting_v2 is
  // forbidden (platform may not import from solutions), so we assert the other
  // way round: walk the shipped manifest's currentMappings and verify its 32
  // leaf paths and their expected types. The registration check itself (run at
  // plugin setup by the security_detections plugin) is the authoritative proof
  // that the real definitions pass; this test proves the manifest is complete.
  // ---------------------------------------------------------------------------

  describe('real manifest — detectionRuleBuilderFieldsManifest', () => {
    const { currentMappings } = detectionRuleBuilderFieldsManifest;

    it('has exactly 32 leaf paths', () => {
      expect(Object.keys(currentMappings)).toHaveLength(32);
    });

    it('covers the expected common leaves', () => {
      const expected: Array<[string, string]> = [
        ['severity', 'keyword'],
        ['risk_score', 'integer'],
        ['max_signals', 'integer'],
        ['threat.framework', 'keyword'],
        ['threat.tactic.id', 'keyword'],
        ['threat.tactic.name', 'keyword'],
        ['threat.tactic.reference', 'keyword'],
        ['threat.technique.id', 'keyword'],
        ['threat.technique.name', 'keyword'],
        ['threat.technique.reference', 'keyword'],
        ['threat.technique.subtechnique.id', 'keyword'],
        ['threat.technique.subtechnique.name', 'keyword'],
        ['threat.technique.subtechnique.reference', 'keyword'],
        ['setup', 'text'],
        ['note', 'text'],
        ['references', 'keyword'],
        ['false_positives', 'keyword'],
        ['author', 'keyword'],
        ['license', 'keyword'],
        ['related_integrations.package', 'keyword'],
        ['related_integrations.version', 'keyword'],
        ['related_integrations.integration', 'keyword'],
        ['required_fields.name', 'keyword'],
        ['required_fields.type', 'keyword'],
        ['required_fields.ecs', 'boolean'],
      ];
      for (const [path, expectedType] of expected) {
        expect(currentMappings[path]).toBeDefined();
        expect(currentMappings[path].type).toBe(expectedType);
      }
    });

    it('covers the shared query/threshold leaves', () => {
      expect(currentMappings['index'].type).toBe('keyword');
      expect(currentMappings['query'].type).toBe('text');
      expect(currentMappings['language'].type).toBe('keyword');
    });

    it('covers the threshold-specific leaves', () => {
      expect(currentMappings['threshold.field'].type).toBe('keyword');
      expect(currentMappings['threshold.value'].type).toBe('integer');
      expect(currentMappings['threshold.cardinality.field'].type).toBe('keyword');
      expect(currentMappings['threshold.cardinality.value'].type).toBe('integer');
    });

    it('every keyword sub-field carries ignore_above equal to KEYWORD_SUB_FIELD_IGNORE_ABOVE', () => {
      for (const mapping of Object.values(currentMappings)) {
        if (mapping.type === 'keyword') {
          expect((mapping as { type: 'keyword'; ignore_above: number }).ignore_above).toBe(
            KEYWORD_SUB_FIELD_IGNORE_ABOVE
          );
        }
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Check 7: managed-type completeness (changed in step B.7)
// ---------------------------------------------------------------------------

describe('assertValidDefinition — check 7: managed-type completeness', () => {
  /**
   * A FoldedVersionsRecord that covers 'type' with a manifest containing the
   * 'value' leaf (to match simpleSchema and pass total mapping).
   */
  function managedFolded(type: string): FoldedVersionsRecord {
    return makeManifestFolded(type);
  }

  it('accepts a fully-declared managed type covered by a folded manifest', () => {
    const folded = managedFolded('security.detection.mytype');
    passes(
      {
        type: 'security.detection.mytype',
        ownership: { solution: 'security', domain: 'detection' },
        compilation: 'execution_time',
      },
      folded
    );
  });

  it('rejects a managed type that does not declare compilation', () => {
    const folded = managedFolded('security.detection.mytype');
    rejects(
      {
        type: 'security.detection.mytype',
        ownership: { solution: 'security', domain: 'detection' },
        compilation: undefined,
      },
      /managed-type completeness check/,
      folded
    );
  });

  it('rejects a managed type that no folded manifest covers', () => {
    // Nothing is recorded in this set, so getManifestForType returns undefined.
    const empty = new FoldedVersionsSet();
    rejects(
      {
        type: 'security.detection.mytype',
        ownership: { solution: 'security', domain: 'detection' },
        compilation: 'execution_time',
      },
      /managed-type completeness check/,
      empty
    );
  });

  it('rejects when the id first two segments do not match ownership', () => {
    const folded = managedFolded('other.thing.mytype');
    rejects(
      {
        type: 'other.thing.mytype',
        ownership: { solution: 'security', domain: 'detection' },
        compilation: 'execution_time',
      },
      /managed-type completeness check/,
      folded
    );
  });

  it('rejects when the id has exactly two segments matching solution and domain (missing <name>)', () => {
    // 'security.detection' has the right solution and domain segments but no
    // <name> segment, so only the segments.length < 3 clause rejects it.
    const folded = managedFolded('security.detection');
    rejects(
      {
        type: 'security.detection',
        ownership: { solution: 'security', domain: 'detection' },
        compilation: 'execution_time',
      },
      /managed-type completeness check/,
      folded
    );
  });

  it('rejects when the id has fewer than three segments (single segment)', () => {
    rejects(
      {
        type: 'security',
        ownership: { solution: 'security', domain: 'detection' },
        compilation: 'execution_time',
      },
      // 'security' has one segment: segments[1] is undefined, so the length
      // clause fires first (before any domain mismatch clause).
      /check/
    );
  });

  it('accepts an unmanaged type with no ownership', () => {
    passes({ ownership: undefined });
  });
});

// ---------------------------------------------------------------------------
// Check 8: mode consistency
// ---------------------------------------------------------------------------

describe('assertValidDefinition — check 8: mode consistency', () => {
  it('accepts deriveRuleFields on an execution-time type', () => {
    passes({
      compilation: 'execution_time',
      deriveRuleFields: jest.fn(),
    });
  });

  it('rejects deriveRuleFields on a write-time type', () => {
    rejects(
      {
        compilation: 'write_time',
        deriveRuleFields: jest.fn(),
      },
      /mode consistency check/
    );
  });

  it('rejects deriveRuleFields when compilation is not set (defaults to write_time semantics)', () => {
    rejects(
      {
        compilation: undefined,
        deriveRuleFields: jest.fn(),
      },
      /mode consistency check/
    );
  });

  it('accepts a write-time type with no deriveRuleFields', () => {
    passes({ compilation: 'write_time', deriveRuleFields: undefined });
  });

  it('accepts an execution-time type with no deriveRuleFields', () => {
    passes({ compilation: 'execution_time', deriveRuleFields: undefined });
  });

  it('accepts enrichRuleEvent on an execution-time type', () => {
    passes({
      compilation: 'execution_time',
      enrichRuleEvent: jest.fn(),
    });
  });

  it('rejects enrichRuleEvent on a write-time type', () => {
    rejects(
      {
        compilation: 'write_time',
        enrichRuleEvent: jest.fn(),
      },
      /mode consistency check/
    );
  });

  it('rejects enrichRuleEvent when compilation is not set (defaults to write_time semantics)', () => {
    rejects(
      {
        compilation: undefined,
        enrichRuleEvent: jest.fn(),
      },
      /mode consistency check/
    );
  });

  it('accepts a write-time type with no enrichRuleEvent', () => {
    passes({ compilation: 'write_time', enrichRuleEvent: undefined });
  });

  it('accepts an execution-time type with no enrichRuleEvent', () => {
    passes({ compilation: 'execution_time', enrichRuleEvent: undefined });
  });
});
