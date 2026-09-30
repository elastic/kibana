/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import type { BuilderFieldsManifest } from '@kbn/alerting-v2-rule-builders';
import { KEYWORD_SUB_FIELD_IGNORE_ABOVE } from '@kbn/alerting-v2-rule-builders';
import { FoldedVersionsSet } from '../../lib/builder_types/folded_versions';
import {
  ruleSavedObjectAttributesSchemaV6,
  ruleSavedObjectAttributesSchemaV11 as latestV11,
  currentRuleSavedObjectAttributesSchema,
} from '../schemas/rule_saved_object_attributes';
import { ruleMetadataSchema as ruleMetadataSchemaV6 } from '../schemas/rule_saved_object_attributes/v6';
import {
  fromBuilderFieldsManifest,
  assertBuilderFieldsIsOpenRecord,
} from './from_builder_fields_manifest';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A prefix that avoids polluting the global singleton with production type names. */
const T1 = 'test.fixture.typeA';
const T2 = 'test.fixture.typeB';

/**
 * Minimal rule document shape understood by the backfill functions.
 */
function makeDoc(overrides: { builderType?: string; builderFields?: Record<string, unknown> }): {
  id: string;
  attributes: Record<string, unknown>;
} {
  return {
    id: 'test-id',
    attributes: {
      metadata: {
        name: 'test rule',
        builder_type: overrides.builderType,
        builder_fields: overrides.builderFields,
      },
    },
  };
}

/**
 * Mirrors how core applies a data_backfill: the result is deep-merged into the
 * document's attributes.
 */
function applyBackfill(
  backfillFn: (doc: any, ctx: any) => { attributes: Record<string, unknown> },
  doc: ReturnType<typeof makeDoc>
): Record<string, unknown> {
  const result = backfillFn(doc, {});
  return merge({}, doc.attributes, result.attributes);
}

/**
 * A minimal attributes schema used across tests. Must support .extends().
 */
const testSchema = latestV11;

// A manifest with only addedMappings at version 1 (no backfills).
const manifestMappingsOnly: BuilderFieldsManifest = {
  builderTypes: [T1, T2],
  currentMappings: {
    severity: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
    risk_score: { type: 'integer' },
  },
  currentVersion: 1,
  versions: {
    1: {
      addedMappings: {
        severity: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
        risk_score: { type: 'integer' },
      },
    },
  },
};

// A manifest with two scoped backfills (one per builder type) at version 1.
const manifestTwoBackfills: BuilderFieldsManifest = {
  builderTypes: [T1, T2],
  currentMappings: {
    score: { type: 'integer' },
    label: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
  },
  currentVersion: 1,
  versions: {
    1: {
      addedMappings: {
        score: { type: 'integer' },
        label: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
      },
      backfills: [
        {
          builderTypes: [T1],
          migrate: (fields) => ({ ...fields, score: 10 }),
        },
        {
          builderTypes: [T2],
          migrate: (fields) => ({ ...fields, score: 20 }),
        },
      ],
    },
  },
};

// A manifest with no addedMappings and one backfill.
const manifestBackfillOnly: BuilderFieldsManifest = {
  builderTypes: [T1],
  currentMappings: {
    note: { type: 'text' },
  },
  currentVersion: 1,
  versions: {
    1: {
      addedMappings: { note: { type: 'text' } },
      backfills: [
        {
          builderTypes: [T1],
          migrate: (fields) => ({ ...fields, note: 'default note' }),
        },
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('fromBuilderFieldsManifest', () => {
  // ---------------------------------------------------------------------------
  // 1. Version with only addedMappings → exactly one change
  // ---------------------------------------------------------------------------
  describe('version with only addedMappings produces exactly one change', () => {
    it('produces exactly one change: a mappings_addition', () => {
      const mv = fromBuilderFieldsManifest(manifestMappingsOnly, 1, testSchema);
      expect(mv.changes).toHaveLength(1);
      expect(mv.changes[0].type).toBe('mappings_addition');
    });

    it('the mappings_addition reaches metadata.builder_fields.properties', () => {
      const mv = fromBuilderFieldsManifest(manifestMappingsOnly, 1, testSchema);
      const change = mv.changes[0] as { type: string; addedMappings: any };
      expect(change.addedMappings).toEqual({
        metadata: {
          properties: {
            builder_fields: {
              type: 'flattened',
              ignore_above: 4096,
              properties: {
                severity: { type: 'keyword', ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE },
                risk_score: { type: 'integer' },
              },
            },
          },
        },
      });
    });

    it('does NOT produce a data_backfill (no identity backfill injected)', () => {
      const mv = fromBuilderFieldsManifest(manifestMappingsOnly, 1, testSchema);
      const backfills = mv.changes.filter((c) => c.type === 'data_backfill');
      expect(backfills).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Version with two scoped backfills → two guarded data_backfills
  // ---------------------------------------------------------------------------
  describe('version with two scoped backfills produces two guarded data_backfills', () => {
    it('produces three changes: one mappings_addition and two data_backfills', () => {
      const mv = fromBuilderFieldsManifest(manifestTwoBackfills, 1, testSchema);
      expect(mv.changes).toHaveLength(3);
      expect(mv.changes[0].type).toBe('mappings_addition');
      expect(mv.changes[1].type).toBe('data_backfill');
      expect(mv.changes[2].type).toBe('data_backfill');
    });

    it('first backfill rewrites typeA rules: sets score to 10', () => {
      const mv = fromBuilderFieldsManifest(manifestTwoBackfills, 1, testSchema);
      const change = mv.changes[1] as { type: string; backfillFn: any };
      const doc = makeDoc({ builderType: T1, builderFields: { score: 0 } });
      const result = applyBackfill(change.backfillFn, doc);
      expect((result as any).metadata.builder_fields.score).toBe(10);
    });

    it('second backfill rewrites typeB rules: sets score to 20', () => {
      const mv = fromBuilderFieldsManifest(manifestTwoBackfills, 1, testSchema);
      const change = mv.changes[2] as { type: string; backfillFn: any };
      const doc = makeDoc({ builderType: T2, builderFields: { score: 0 } });
      const result = applyBackfill(change.backfillFn, doc);
      expect((result as any).metadata.builder_fields.score).toBe(20);
    });

    it('each backfill leaves the other type untouched', () => {
      const mv = fromBuilderFieldsManifest(manifestTwoBackfills, 1, testSchema);
      const firstBackfill = mv.changes[1] as { type: string; backfillFn: any };
      const secondBackfill = mv.changes[2] as { type: string; backfillFn: any };

      // First backfill should not rewrite T2 rules
      const docT2 = makeDoc({ builderType: T2, builderFields: { score: 99 } });
      const resultFirst = firstBackfill.backfillFn(docT2, {});
      expect(resultFirst.attributes).toEqual({});

      // Second backfill should not rewrite T1 rules
      const docT1 = makeDoc({ builderType: T1, builderFields: { score: 99 } });
      const resultSecond = secondBackfill.backfillFn(docT1, {});
      expect(resultSecond.attributes).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // 3. A backfill leaves a rule of another builder type untouched
  // ---------------------------------------------------------------------------
  describe('a backfill leaves rules of non-covered builder types untouched', () => {
    it('returns empty attributes for a rule with a different builder_type', () => {
      const mv = fromBuilderFieldsManifest(manifestBackfillOnly, 1, testSchema);
      const change = mv.changes.find((c) => c.type === 'data_backfill') as {
        type: string;
        backfillFn: any;
      };
      const doc = makeDoc({ builderType: 'security.some.other.type', builderFields: {} });
      const { attributes: returned } = change.backfillFn(doc, {});
      expect(returned).toEqual({});
    });

    it('returns empty attributes for a rule with no builder_type', () => {
      const mv = fromBuilderFieldsManifest(manifestBackfillOnly, 1, testSchema);
      const change = mv.changes.find((c) => c.type === 'data_backfill') as {
        type: string;
        backfillFn: any;
      };
      const doc = makeDoc({ builderType: undefined, builderFields: {} });
      const { attributes: returned } = change.backfillFn(doc, {});
      expect(returned).toEqual({});
    });

    it('rewrites a rule whose builder_type is in the backfill scope', () => {
      const mv = fromBuilderFieldsManifest(manifestBackfillOnly, 1, testSchema);
      const change = mv.changes.find((c) => c.type === 'data_backfill') as {
        type: string;
        backfillFn: any;
      };
      const doc = makeDoc({ builderType: T1, builderFields: {} });
      const { attributes: returned } = change.backfillFn(doc, {});
      expect((returned as any).metadata.builder_fields.note).toBe('default note');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Both schemas come from the argument
  // ---------------------------------------------------------------------------
  describe('schemas come from the attributesSchema argument', () => {
    it('sets schemas.create to the passed attributesSchema', () => {
      const mv = fromBuilderFieldsManifest(manifestMappingsOnly, 1, testSchema);
      expect(mv.schemas?.create).toBe(testSchema);
    });

    it('sets schemas.forwardCompatibility to the schema with unknowns ignored', () => {
      const mv = fromBuilderFieldsManifest(manifestMappingsOnly, 1, testSchema);
      const fwd = mv.schemas?.forwardCompatibility;
      expect(fwd).toBeDefined();
      // The forwardCompatibility schema must NOT be the same object as create
      // (it was built with .extends({}, { unknowns: 'ignore' })).
      expect(fwd).not.toBe(testSchema);
    });

    it('forwardCompatibility schema ignores unknown attributes', () => {
      const mv = fromBuilderFieldsManifest(manifestMappingsOnly, 1, testSchema);
      const fwd = mv.schemas?.forwardCompatibility as any;
      // A document with an extra top-level attribute that V11 does not know should
      // be accepted by forwardCompatibility (unknowns: 'ignore') but rejected by create.
      const docWithUnknown = {
        kind: 'alert' as const,
        metadata: { name: 'test', builder_fields: {} },
        time_field: '@timestamp',
        schedule: { every: '1m' },
        query: { base: 'FROM x | LIMIT 1' },
        recovery: { strategy: 'manual' as const },
        no_data: { strategy: 'ignore' as const },
        enabled: false,
        createdBy: null,
        updatedBy: null,
        createdAt: '1970-01-01T00:00:00.000Z',
        updatedAt: '1970-01-01T00:00:00.000Z',
        __unknown_future_field__: 'should be ignored',
      };
      expect(() => fwd.validate(docWithUnknown)).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Fold-completeness check: fails on an unfolded version
  // ---------------------------------------------------------------------------
  describe('fold-completeness check via FoldedVersionsSet.hasManifestVersion', () => {
    it('records the fold in a fresh FoldedVersionsSet via addFoldedManifest', () => {
      // Use a fresh FoldedVersionsSet (not the global singleton) to avoid
      // polluting other tests.
      const foldedSet = new FoldedVersionsSet();
      const isolatedManifest: BuilderFieldsManifest = {
        builderTypes: ['test.fold.completeness.type'],
        currentMappings: { score: { type: 'integer' } },
        currentVersion: 1,
        versions: { 1: { addedMappings: { score: { type: 'integer' } } } },
      };

      // Before the call: not recorded.
      expect(foldedSet.hasManifestVersion(isolatedManifest, 1)).toBe(false);

      // fromBuilderFieldsManifest calls addFoldedManifest as a side effect,
      // but into the GLOBAL singleton. We test the FoldedVersionsSet mechanics
      // directly to avoid relying on the global state.
      foldedSet.recordManifest(isolatedManifest, 1);

      // After recording: hasManifestVersion returns true.
      expect(foldedSet.hasManifestVersion(isolatedManifest, 1)).toBe(true);
    });

    it('hasManifestVersion returns false for a version not yet folded', () => {
      const foldedSet = new FoldedVersionsSet();
      const twoVersionManifest: BuilderFieldsManifest = {
        builderTypes: ['test.fold.v2.type'],
        currentMappings: {
          a: { type: 'integer' },
          b: { type: 'integer' },
        },
        currentVersion: 2,
        versions: {
          1: { addedMappings: { a: { type: 'integer' } } },
          2: { addedMappings: { b: { type: 'integer' } } },
        },
      };

      foldedSet.recordManifest(twoVersionManifest, 1);

      // Version 1 recorded; version 2 not yet.
      expect(foldedSet.hasManifestVersion(twoVersionManifest, 1)).toBe(true);
      expect(foldedSet.hasManifestVersion(twoVersionManifest, 2)).toBe(false);
    });

    it('has(type, version) derives from the recorded manifest', () => {
      const foldedSet = new FoldedVersionsSet();
      const m: BuilderFieldsManifest = {
        builderTypes: ['test.derive.q', 'test.derive.t'],
        currentMappings: { risk_score: { type: 'integer' } },
        currentVersion: 1,
        versions: { 1: { addedMappings: { risk_score: { type: 'integer' } } } },
      };

      foldedSet.recordManifest(m, 1);

      // Both types in the manifest are now derivable via has().
      expect(foldedSet.has('test.derive.q', 1)).toBe(true);
      expect(foldedSet.has('test.derive.t', 1)).toBe(true);
      // A type not in the manifest is not covered.
      expect(foldedSet.has('test.derive.other', 1)).toBe(false);
    });

    it('getManifestForType returns the covering manifest', () => {
      const foldedSet = new FoldedVersionsSet();
      const m: BuilderFieldsManifest = {
        builderTypes: ['test.lookup.q'],
        currentMappings: { risk_score: { type: 'integer' } },
        currentVersion: 1,
        versions: { 1: { addedMappings: { risk_score: { type: 'integer' } } } },
      };

      foldedSet.recordManifest(m, 1);

      expect(foldedSet.getManifestForType('test.lookup.q')).toBe(m);
      expect(foldedSet.getManifestForType('test.lookup.unknown')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Missing version guard
  // ---------------------------------------------------------------------------
  describe('missing version guard', () => {
    it('throws if the manifest has no entry for the requested version', () => {
      expect(() => fromBuilderFieldsManifest(manifestMappingsOnly, 99, testSchema)).toThrow(
        /has no version 99/
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Open-record assertion
  //
  // The persisted attributes schema must keep `metadata.builder_fields` as an
  // open record so that new builder fields never fail against older code during
  // rollback. This test pins that property.
  //
  // Ref: rule-data-migration.md "Rollback behavior"
  // ---------------------------------------------------------------------------
  describe('open-record assertion: metadata.builder_fields stays an open record', () => {
    it('currentRuleSavedObjectAttributesSchema is the latest versioned schema (v11)', () => {
      expect(currentRuleSavedObjectAttributesSchema).toBe(latestV11);
    });

    it('assertBuilderFieldsIsOpenRecord does not throw with the current schema', () => {
      expect(() => assertBuilderFieldsIsOpenRecord()).not.toThrow();
    });

    // The three tests below cover v6 specifically, because v6 is the version that
    // introduced the builder_fields container and therefore the version a rollback
    // lands on when a deployment that deployed v11 rolls back.
    //
    // The rollback property rests on schema.recordOf(schema.string(), schema.any())
    // preserving every key it sees. The tests above only prove the current schema
    // (v11) does not throw on an unknown key; they do not prove key preservation
    // or that v6 carries the open-record declaration at all.

    it('the v6 ruleMetadataSchema accepts an object with arbitrary unknown keys in builder_fields', () => {
      // v6 introduced builder_fields: schema.maybe(schema.recordOf(schema.string(), schema.any())).
      // This must accept any future key a newer manifest version adds.
      expect(() =>
        ruleMetadataSchemaV6.validate({
          name: 'test-rule',
          builder_fields: { __future_field__: 'future_value', another_field: 42 },
        })
      ).not.toThrow();
    });

    it('the validated builder_fields value preserves all arbitrary keys', () => {
      // schema.recordOf(schema.string(), schema.any()) must preserve every key
      // it receives, not just ignore unknown ones. A validator that strips keys
      // would break rollback: a rolled-back build reading a v11 rule would lose
      // the new builder fields before returning them to the caller.
      const result = ruleMetadataSchemaV6.validate({
        name: 'test-rule',
        builder_fields: { __future_field__: 'future_value', numeric_field: 99 },
      });
      expect(result.builder_fields).toEqual({
        __future_field__: 'future_value',
        numeric_field: 99,
      });
    });

    it('the full v6 attributes schema also keeps builder_fields open', () => {
      // The full v6 attributes schema must also preserve unknown builder_fields keys,
      // because forwardCompatibility for v6 fold lines uses this schema with
      // unknowns: 'ignore' — unknown *attributes* are dropped, but keys inside
      // the open-record builder_fields container are preserved intact.
      const minimalV6Doc = {
        kind: 'alert',
        metadata: {
          name: 'test-rule',
          builder_fields: { __future_field__: 'future_value' },
        },
        query: { base: 'FROM logs-* | LIMIT 1', breach: { segment: 'WHERE count > 10' } },
        recovery: { strategy: 'no_breach' },
        no_data: { strategy: 'ignore' },
        schedule: { every: '1m' },
        time_field: '@timestamp',
        enabled: true,
        createdBy: null,
        updatedBy: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      const validated = ruleSavedObjectAttributesSchemaV6.validate(minimalV6Doc);
      expect((validated as any).metadata.builder_fields).toEqual({
        __future_field__: 'future_value',
      });
    });
  });
});
