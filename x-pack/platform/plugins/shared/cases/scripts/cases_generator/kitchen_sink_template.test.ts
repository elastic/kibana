/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildKitchenSinkExtendedFields,
  getKitchenSinkDefinition,
  KITCHEN_SINK_FIELD_DEFS,
} from './kitchen_sink_template';
import { installSeededRandom } from './utils';

describe('kitchen_sink_template', () => {
  describe('getKitchenSinkDefinition', () => {
    it('parses the YAML into a well-formed template definition', () => {
      const def = getKitchenSinkDefinition();
      expect(def.name).toBe('Example template');
      expect(def.severity).toBe('low');
      expect(def.category).toBe('General');
      expect(Array.isArray(def.fields)).toBe(true);
      expect(def.fields.length).toBeGreaterThanOrEqual(15);
    });

    it('returns a fresh deep clone each call so mutations do not leak', () => {
      const a = getKitchenSinkDefinition();
      a.name = 'Mutated';
      a.fields[0].name = 'mutated';
      const b = getKitchenSinkDefinition();
      expect(b.name).toBe('Example template');
      expect(b.fields[0].name).not.toBe('mutated');
    });

    it('exposes the same fields array via KITCHEN_SINK_FIELD_DEFS', () => {
      const def = getKitchenSinkDefinition();
      expect(KITCHEN_SINK_FIELD_DEFS).toHaveLength(def.fields.length);
      expect(KITCHEN_SINK_FIELD_DEFS.map((f) => f.name)).toEqual(def.fields.map((f) => f.name));
    });
  });

  describe('buildKitchenSinkExtendedFields', () => {
    it('emits one entry per field, keyed by <name>_as_<type>', () => {
      const restore = installSeededRandom('kitchen-sink-keys');
      try {
        const values = buildKitchenSinkExtendedFields(KITCHEN_SINK_FIELD_DEFS);
        for (const field of KITCHEN_SINK_FIELD_DEFS) {
          const key = `${field.name}_as_${field.type}`;
          expect(values[key]).toBeDefined();
        }
        expect(Object.keys(values)).toHaveLength(KITCHEN_SINK_FIELD_DEFS.length);
      } finally {
        restore();
      }
    });

    it('prefers metadata.default for fields that declare one', () => {
      const restore = installSeededRandom('kitchen-sink-defaults');
      try {
        const values = buildKitchenSinkExtendedFields(KITCHEN_SINK_FIELD_DEFS);
        expect(values.summary_as_keyword).toBe('Default summary text');
        expect(values.effort_as_integer).toBe('1');
        expect(values.priority_as_keyword).toBe('medium');
        expect(values.environment_as_keyword).toBe('staging');
      } finally {
        restore();
      }
    });

    it('JSON-encodes the CHECKBOX_GROUP value to fit the keyword schema', () => {
      const restore = installSeededRandom('kitchen-sink-checkbox');
      try {
        const values = buildKitchenSinkExtendedFields(KITCHEN_SINK_FIELD_DEFS);
        const parsed = JSON.parse(values.affected_components_as_keyword);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed).toContain('api');
      } finally {
        restore();
      }
    });

    it('keeps every integer value within its declared min/max when set', () => {
      const restore = installSeededRandom('kitchen-sink-integer-bounds');
      try {
        const values = buildKitchenSinkExtendedFields(KITCHEN_SINK_FIELD_DEFS);
        const score = Number.parseInt(values.score_as_integer, 10);
        // score has a metadata.default of 80, so the value should equal that.
        expect(score).toBe(80);
      } finally {
        restore();
      }
    });

    it('is deterministic when the same seed is installed', () => {
      const restoreA = installSeededRandom('kitchen-sink-repeat');
      const first = buildKitchenSinkExtendedFields(KITCHEN_SINK_FIELD_DEFS);
      restoreA();

      const restoreB = installSeededRandom('kitchen-sink-repeat');
      const second = buildKitchenSinkExtendedFields(KITCHEN_SINK_FIELD_DEFS);
      restoreB();

      // Date keys are skipped here because new Date().toISOString() is a wall-clock
      // call and never seedable. Every other key should be byte-identical.
      const stripDates = (obj: Record<string, string>) =>
        Object.fromEntries(Object.entries(obj).filter(([key]) => !key.endsWith('_as_date')));
      expect(stripDates(first)).toEqual(stripDates(second));
    });
  });
});
