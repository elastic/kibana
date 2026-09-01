/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildLegacyCustomFieldValuesForCase,
  buildLegacyTemplates,
  LEGACY_CUSTOM_FIELD_KEYS,
  LEGACY_CUSTOM_FIELDS_CONFIG,
  LEGACY_TEMPLATE_KEYS,
} from './configure_customfields';
import { AUTO_GENERATED_TAG, installSeededRandom } from './utils';

describe('legacy_customfields', () => {
  describe('LEGACY_CUSTOM_FIELDS_CONFIG', () => {
    it('only registers the three plugin-supported customField types', () => {
      const allowed = new Set(['text', 'toggle', 'number']);
      for (const entry of LEGACY_CUSTOM_FIELDS_CONFIG) {
        expect(allowed.has(entry.type)).toBe(true);
      }
    });

    it('exposes a stable LEGACY_CUSTOM_FIELD_KEYS list aligned with the config', () => {
      expect(LEGACY_CUSTOM_FIELD_KEYS).toEqual(LEGACY_CUSTOM_FIELDS_CONFIG.map((e) => e.key));
    });

    it('keeps customField keys unique', () => {
      expect(new Set(LEGACY_CUSTOM_FIELD_KEYS).size).toBe(LEGACY_CUSTOM_FIELD_KEYS.length);
    });
  });

  describe('buildLegacyCustomFieldValuesForCase', () => {
    it('emits one value per registered customField, with matching type', () => {
      const restore = installSeededRandom('legacy-cf-shape');
      try {
        const values = buildLegacyCustomFieldValuesForCase();
        expect(values).toHaveLength(LEGACY_CUSTOM_FIELDS_CONFIG.length);
        for (let i = 0; i < values.length; i++) {
          expect(values[i].key).toBe(LEGACY_CUSTOM_FIELDS_CONFIG[i].key);
          expect(values[i].type).toBe(LEGACY_CUSTOM_FIELDS_CONFIG[i].type);
        }
      } finally {
        restore();
      }
    });

    it('produces values whose runtime type matches the customField type', () => {
      const restore = installSeededRandom('legacy-cf-types');
      try {
        const values = buildLegacyCustomFieldValuesForCase();
        for (const entry of values) {
          if (entry.type === 'text') {
            expect(typeof entry.value).toBe('string');
          } else if (entry.type === 'toggle') {
            expect(typeof entry.value).toBe('boolean');
          } else {
            expect(typeof entry.value).toBe('number');
          }
        }
      } finally {
        restore();
      }
    });

    it('keeps numeric values within sensible bounds for the demo', () => {
      const restore = installSeededRandom('legacy-cf-bounds');
      try {
        const values = buildLegacyCustomFieldValuesForCase();
        const sla = values.find((v) => v.key === 'sla_minutes');
        const userCount = values.find((v) => v.key === 'affected_user_count');
        expect(sla && [15, 30, 60, 120, 240]).toContain(sla?.value);
        expect(typeof userCount?.value).toBe('number');
        expect((userCount?.value as number) >= 0).toBe(true);
        expect((userCount?.value as number) < 5_000).toBe(true);
      } finally {
        restore();
      }
    });

    it('is deterministic under the same seed', () => {
      const seed = 'legacy-cf-determinism';
      const restoreA = installSeededRandom(seed);
      const a = buildLegacyCustomFieldValuesForCase();
      restoreA();
      const restoreB = installSeededRandom(seed);
      const b = buildLegacyCustomFieldValuesForCase();
      restoreB();
      expect(a).toEqual(b);
    });
  });

  describe('buildLegacyTemplates', () => {
    it('emits stable template keys aligned with LEGACY_TEMPLATE_KEYS', () => {
      const templates = buildLegacyTemplates(true);
      expect(templates.map((t) => t.key)).toEqual([...LEGACY_TEMPLATE_KEYS]);
    });

    it('attaches the auto-generated tag and "legacy" tag to every template', () => {
      const templates = buildLegacyTemplates(true);
      for (const tpl of templates) {
        expect(tpl.tags).toContain(AUTO_GENERATED_TAG);
        expect(tpl.tags).toContain('legacy');
      }
    });

    it('populates caseFields.customFields when --legacyCustomFields is enabled', () => {
      const templates = buildLegacyTemplates(true);
      for (const tpl of templates) {
        expect(tpl.caseFields.customFields).toHaveLength(LEGACY_CUSTOM_FIELDS_CONFIG.length);
        for (const cf of tpl.caseFields.customFields) {
          expect(LEGACY_CUSTOM_FIELD_KEYS).toContain(cf.key);
        }
      }
    });

    it('emits empty caseFields.customFields when --legacyCustomFields is off', () => {
      const templates = buildLegacyTemplates(false);
      for (const tpl of templates) {
        expect(tpl.caseFields.customFields).toEqual([]);
      }
    });

    it('keeps template severity within the cases plugin allow-list', () => {
      const templates = buildLegacyTemplates(true);
      const allowed = new Set(['low', 'medium', 'high', 'critical']);
      for (const tpl of templates) {
        expect(allowed.has(tpl.caseFields.severity)).toBe(true);
      }
    });

    it('respects per-template overrides defined in seed metadata', () => {
      const templates = buildLegacyTemplates(true);
      const high = templates.find((t) => t.key === 'legacy-incident-high');
      const sla = high?.caseFields.customFields.find((cf) => cf.key === 'sla_minutes');
      expect(sla?.value).toBe(30);

      const critical = templates.find((t) => t.key === 'legacy-incident-postmortem');
      const postmortem = critical?.caseFields.customFields.find(
        (cf) => cf.key === 'requires_postmortem'
      );
      expect(postmortem?.value).toBe(true);
    });
  });
});
