/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';
import { conditionToESQL } from '@kbn/streamlang';
import { resolveExtractionGate } from './extraction_gate';

const gate: Condition = { field: 'event.kind', includes: 'asset' };

describe('resolveExtractionGate', () => {
  it('returns the declared gate for priority', () => {
    expect(resolveExtractionGate(gate, 'priority')).toBe(gate);
  });

  it('returns no gate for single, so an ungated clause is rendered', () => {
    expect(resolveExtractionGate(gate, 'single')).toBeUndefined();
  });

  it.each(['single', 'priority', 'nonPriority'] as const)(
    'returns no gate for %s when the type declares none',
    (extractionMode) => {
      expect(resolveExtractionGate(undefined, extractionMode)).toBeUndefined();
    }
  );

  describe('nonPriority complement', () => {
    it('negates the declared gate and admits documents missing the gated field', () => {
      expect(resolveExtractionGate(gate, 'nonPriority')).toEqual({
        or: [{ field: 'event.kind', exists: false }, { not: gate }],
      });
    });

    /**
     * The guard against the silent failure this whole split can have: under ESQL three-valued
     * logic a bare negation is null on a document missing the gated field, which would drop that
     * document from both processes instead of assigning it to one.
     */
    it('renders an explicit null arm rather than a bare negation', () => {
      const complement = resolveExtractionGate(gate, 'nonPriority');

      expect(conditionToESQL(complement!)).toBe(
        '`event.kind` IS NULL OR NOT COALESCE(MV_CONTAINS(`event.kind`, "asset"), FALSE)'
      );
    });

    it('carries the gated field over, so the null arm follows the declared gate', () => {
      const complement = resolveExtractionGate({ field: 'user.name', exists: true }, 'nonPriority');

      expect(complement).toEqual({
        or: [{ field: 'user.name', exists: false }, { not: { field: 'user.name', exists: true } }],
      });
    });

    /** A composite gate spans several fields, each with its own null case, so it cannot be inferred. */
    it('rejects a composite gate instead of inferring an unsound complement', () => {
      const composite: Condition = { and: [gate, { field: 'user.name', exists: true }] };

      expect(() => resolveExtractionGate(composite, 'nonPriority')).toThrow(
        /must be a single-field condition/
      );
    });

    /**
     * An `exists: false` gate matches missing-field documents. Its complement `{ or: [exists: false, { not: exists: false }] }`
     * also matches missing-field documents, so priority and non-priority would both process them.
     */
    it('rejects an exists: false gate because its complement is not a strict partition', () => {
      expect(() =>
        resolveExtractionGate({ field: 'event.kind', exists: false }, 'nonPriority')
      ).toThrow(/cannot use exists: false/);
    });
  });
});
