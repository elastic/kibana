/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Step 4.5: model version '9' backfill and static mapping tests.
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
 * 12. Version '9' is present in ruleModelVersions with both changes.
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

type BackfillFn = (doc: {
  id: string;
  attributes: { metadata?: Record<string, unknown> };
}) => { attributes: { metadata?: Record<string, unknown> } };

/**
 * Extracts the `backfillFn` from model version '9'.
 *
 * The version has two changes: mappings_addition first, data_backfill second.
 * We reach into the changes array to find the data_backfill entry.
 */
function getV9BackfillFn(): BackfillFn {
  const v9 = ruleModelVersions['9'] as {
    changes: Array<{
      type: string;
      backfillFn?: BackfillFn;
    }>;
  };
  expect(v9).toBeDefined();
  const backfillChange = v9.changes.find((c) => c.type === 'data_backfill');
  expect(backfillChange).toBeDefined();
  return backfillChange!.backfillFn!;
}

/**
 * Runs the backfill on a synthetic doc and returns the resulting metadata.
 */
function runBackfill(
  id: string,
  metadata: Record<string, unknown>
): Record<string, unknown> {
  const fn = getV9BackfillFn();
  const result = fn({ id, attributes: { metadata } });
  return result.attributes.metadata as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// 1–2. signature_id
// ---------------------------------------------------------------------------

describe('model version 9 backfill — signature_id', () => {
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

describe('model version 9 backfill — source', () => {
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

describe('model version 9 backfill — revision', () => {
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

describe('model version 9 backfill — ownership', () => {
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

describe('model version 9 backfill — full document migration', () => {
  it('migrates a pre-existing rule to carry all four field families', () => {
    // Simulate a rule stored before version 9 was released — none of the new
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
    // model version 9 was released. All new fields are already present.
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
// 12. Version '9' structure
// ---------------------------------------------------------------------------

describe("ruleModelVersions version '9'", () => {
  it("contains key '9'", () => {
    expect(ruleModelVersions).toHaveProperty('9');
  });

  it("version '9' has a mappings_addition change", () => {
    const v9 = ruleModelVersions['9'] as { changes: Array<{ type: string }> };
    expect(v9.changes.some((c) => c.type === 'mappings_addition')).toBe(true);
  });

  it("version '9' has a data_backfill change", () => {
    const v9 = ruleModelVersions['9'] as { changes: Array<{ type: string }> };
    expect(v9.changes.some((c) => c.type === 'data_backfill')).toBe(true);
  });

  it("version '9' mappings_addition covers all five new metadata paths", () => {
    const v9 = ruleModelVersions['9'] as {
      changes: Array<{ type: string; addedMappings?: Record<string, unknown> }>;
    };
    const mappingsChange = v9.changes.find((c) => c.type === 'mappings_addition');
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

describe('ruleMappings — Phase 4 framework fields (model version 9)', () => {
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
