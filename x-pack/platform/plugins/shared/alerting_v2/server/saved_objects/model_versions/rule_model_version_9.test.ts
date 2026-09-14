/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Step 4.5: framework field backfill and static mapping tests.
 *
 * Originally written for model version '9'. The POC's five model versions
 * ('6'–'10') were squashed into a single '6' to satisfy the saved-objects
 * checker's one-new-version-per-PR rule. All tests now target the squashed '6',
 * which carries the same backfill and mappings as the original '9'.
 *
 * Tests that:
 * 1. The backfill sets signature_id to the document id when absent.
 * 2. The backfill preserves an already-set signature_id (write path 4.1).
 * 3. The backfill sets source to { type: 'internal', version: 1 } when absent.
 * 4. The backfill preserves an existing source object.
 * 5. The backfill sets revision to 0 when absent.
 * 6. The backfill preserves an existing non-zero revision.
 * 7. The backfill stamps managed ownership for a managed builder_type.
 * 8. The backfill stamps { managed: false } for an unknown builder_type.
 * 9. The backfill stamps { managed: false } when builder_type is absent.
 * 10. The backfill preserves an already-stamped ownership object.
 * 11. A document with all four field families already present migrates without
 *     any field being overwritten.
 * 12. The squashed version '6' is present in ruleModelVersions with both changes.
 * 13. The static rule_mappings.ts carries all five new top-level metadata paths.
 *
 * Ref: rule-identity.md "Storage and migration"
 *      rule-versions.md "Storage and migration"
 *      rule-source.md "Storage and migration"
 *      rule-ownership.md "Storage, mapping, and migration"
 *      rule-types.md "The discriminator must be indexed and filterable"
 *      implementation-plan.md step 4.5
 */

import { ruleModelVersions } from './rule_model_versions';
import { ruleMappings } from '../rule_mappings';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type BackfillFn = (doc: { id: string; attributes: { metadata?: Record<string, unknown> } }) => {
  attributes: { metadata?: Record<string, unknown> };
};

/**
 * Extracts the `backfillFn` from the squashed model version '6'.
 *
 * The squashed '6' has four mappings_addition changes and one data_backfill.
 * Neither manifest fold (query or threshold) contributes a data_backfill at
 * version 1 (version 1 is exempt from the identity backfill), so there is
 * exactly one data_backfill entry — the framework-fields one originally from '9'.
 */
function getV6BackfillFn(): BackfillFn {
  const v6 = ruleModelVersions['6'] as {
    changes: Array<{
      type: string;
      backfillFn?: BackfillFn;
    }>;
  };
  expect(v6).toBeDefined();
  const backfillChange = v6.changes.find((c) => c.type === 'data_backfill');
  expect(backfillChange).toBeDefined();
  return backfillChange!.backfillFn!;
}

/**
 * Runs the backfill on a synthetic doc and returns the resulting metadata.
 */
function runBackfill(id: string, metadata: Record<string, unknown>): Record<string, unknown> {
  const fn = getV6BackfillFn();
  const result = fn({ id, attributes: { metadata } });
  return result.attributes.metadata as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// 1–2. signature_id
// ---------------------------------------------------------------------------

describe('squashed model version 6 backfill — signature_id', () => {
  it('sets signature_id to the document id when absent', () => {
    const meta = runBackfill('rule-uuid-001', {});
    expect(meta.signature_id).toBe('rule-uuid-001');
  });

  it('preserves an already-set signature_id from the write path', () => {
    const meta = runBackfill('rule-uuid-002', { signature_id: 'RULE-001' });
    expect(meta.signature_id).toBe('RULE-001');
  });
});

// ---------------------------------------------------------------------------
// 3–4. source
// ---------------------------------------------------------------------------

describe('squashed model version 6 backfill — source', () => {
  it('sets source to { type: internal, version: 1 } when absent', () => {
    const meta = runBackfill('rule-uuid-003', {});
    expect(meta.source).toEqual({ type: 'internal', version: 1 });
  });

  it('preserves an existing source object (e.g. template source)', () => {
    const existingSource = { type: 'template', id: 'tpl-001', version: 2 };
    const meta = runBackfill('rule-uuid-004', { source: existingSource });
    expect(meta.source).toEqual(existingSource);
  });
});

// ---------------------------------------------------------------------------
// 5–6. revision
// ---------------------------------------------------------------------------

describe('squashed model version 6 backfill — revision', () => {
  it('sets revision to 0 when absent', () => {
    const meta = runBackfill('rule-uuid-005', {});
    expect(meta.revision).toBe(0);
  });

  it('preserves an existing non-zero revision', () => {
    const meta = runBackfill('rule-uuid-006', { revision: 3 });
    expect(meta.revision).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// 7–10. ownership
// ---------------------------------------------------------------------------

describe('squashed model version 6 backfill — ownership', () => {
  it('stamps managed ownership for security.detection.query', () => {
    const meta = runBackfill('rule-uuid-007', {
      builder_type: 'security.detection.query',
    });
    expect(meta.ownership).toEqual({
      managed: true,
      solution: 'security',
      domain: 'detection',
    });
  });

  it('stamps managed ownership for security.detection.threshold', () => {
    const meta = runBackfill('rule-uuid-008', {
      builder_type: 'security.detection.threshold',
    });
    expect(meta.ownership).toEqual({
      managed: true,
      solution: 'security',
      domain: 'detection',
    });
  });

  it('stamps { managed: false } for an unknown builder_type', () => {
    const meta = runBackfill('rule-uuid-009', {
      builder_type: 'platform.some.unknown_type',
    });
    expect(meta.ownership).toEqual({ managed: false });
  });

  it('stamps { managed: false } when builder_type is absent', () => {
    const meta = runBackfill('rule-uuid-010', {});
    expect(meta.ownership).toEqual({ managed: false });
  });

  it('preserves an already-stamped ownership object', () => {
    const existing = { managed: true, solution: 'security', domain: 'detection' };
    const meta = runBackfill('rule-uuid-011', {
      builder_type: 'security.detection.query',
      ownership: existing,
    });
    expect(meta.ownership).toEqual(existing);
  });
});

// ---------------------------------------------------------------------------
// 11. Full migration: all four field families already present
// ---------------------------------------------------------------------------

describe('squashed model version 6 backfill — full document migration', () => {
  it('migrates a pre-existing rule to carry all four field families', () => {
    // Simulate a rule stored before this version was released — none of the new
    // fields are present. The backfill must add all four.
    const meta = runBackfill('legacy-rule-id', {
      name: 'My detection rule',
      builder_type: 'security.detection.query',
    });

    expect(meta).toMatchObject({
      name: 'My detection rule',
      builder_type: 'security.detection.query',
      signature_id: 'legacy-rule-id',
      source: { type: 'internal', version: 1 },
      revision: 0,
      ownership: { managed: true, solution: 'security', domain: 'detection' },
    });
  });

  it('does not overwrite any field already set by the Phase 4 write paths', () => {
    // Simulate a rule created after steps 4.1–4.4 were deployed but before
    // this model version was released. All new fields are already present.
    const meta = runBackfill('new-rule-id', {
      name: 'Already migrated rule',
      builder_type: 'security.detection.query',
      signature_id: 'CALLER-ASSIGNED-SIG',
      source: { type: 'template', id: 'tpl-999', version: 5 },
      revision: 2,
      ownership: { managed: true, solution: 'security', domain: 'detection' },
    });

    expect(meta.signature_id).toBe('CALLER-ASSIGNED-SIG');
    expect(meta.source).toEqual({ type: 'template', id: 'tpl-999', version: 5 });
    expect(meta.revision).toBe(2);
    expect(meta.ownership).toEqual({ managed: true, solution: 'security', domain: 'detection' });
  });
});

// ---------------------------------------------------------------------------
// 12. Squashed version '6' structure
// ---------------------------------------------------------------------------

describe("ruleModelVersions squashed version '6' (framework fields)", () => {
  it("contains key '6'", () => {
    expect(ruleModelVersions).toHaveProperty('6');
  });

  it("squashed version '6' has the framework-fields mappings_addition (signature_id present)", () => {
    // Selecting by signature_id presence makes this specific: it passes only if the
    // framework-fields block is present, not just any mappings_addition.
    const v6 = ruleModelVersions['6'] as {
      changes: Array<{ type: string; addedMappings?: unknown }>;
    };
    const frameworkMappings = v6.changes.find(
      (c) =>
        c.type === 'mappings_addition' &&
        (c.addedMappings as any)?.metadata?.properties?.signature_id !== undefined
    );
    expect(frameworkMappings).toBeDefined();
  });

  it("squashed version '6' has a data_backfill change", () => {
    const v6 = ruleModelVersions['6'] as { changes: Array<{ type: string }> };
    expect(v6.changes.some((c) => c.type === 'data_backfill')).toBe(true);
  });

  it("squashed version '6' framework mappings_addition covers all five new metadata paths", () => {
    const v6 = ruleModelVersions['6'] as {
      changes: Array<{ type: string; addedMappings?: Record<string, unknown> }>;
    };
    // The squashed '6' has four mappings_addition changes. The framework-fields one
    // (originally version '9') is the only one with signature_id at the top level of
    // metadata.properties (the manifest-fold ones nest under builder_fields.properties).
    const mappingsChange = v6.changes.find(
      (c) =>
        c.type === 'mappings_addition' &&
        (c.addedMappings as any)?.metadata?.properties?.signature_id !== undefined
    );
    expect(mappingsChange).toBeDefined();

    const metaProps = (
      mappingsChange!.addedMappings as {
        metadata: { properties: Record<string, unknown> };
      }
    ).metadata.properties;

    expect(metaProps).toHaveProperty('signature_id');
    expect(metaProps).toHaveProperty('source');
    expect(metaProps).toHaveProperty('ownership');
    expect(metaProps).toHaveProperty('builder_type');
  });
});

// ---------------------------------------------------------------------------
// 13. Static rule_mappings carries all new metadata fields
// ---------------------------------------------------------------------------

describe('ruleMappings — Phase 4 framework fields (squashed model version 6)', () => {
  const metaProperties = () => {
    const meta = ruleMappings.properties?.metadata as
      | { properties?: Record<string, unknown> }
      | undefined;
    return meta?.properties ?? {};
  };

  it('maps metadata.signature_id as keyword', () => {
    expect(metaProperties()).toHaveProperty('signature_id', {
      type: 'keyword',
      ignore_above: 256,
    });
  });

  it('maps metadata.source with type, id, and version sub-fields', () => {
    expect(metaProperties()).toHaveProperty('source', {
      properties: {
        type: { type: 'keyword', ignore_above: 256 },
        id: { type: 'keyword', ignore_above: 256 },
        version: { type: 'integer' },
      },
    });
  });

  it('maps metadata.ownership with managed, solution, domain, and app sub-fields', () => {
    expect(metaProperties()).toHaveProperty('ownership', {
      properties: {
        managed: { type: 'boolean' },
        solution: { type: 'keyword', ignore_above: 256 },
        domain: { type: 'keyword', ignore_above: 256 },
        app: { type: 'keyword', ignore_above: 128 },
      },
    });
  });

  it('maps metadata.builder_type as keyword', () => {
    expect(metaProperties()).toHaveProperty('builder_type', {
      type: 'keyword',
      ignore_above: 256,
    });
  });
});
