/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../../../common/domain/definitions/entity_schema';
import type { LogExtractionConfig } from '../saved_objects';
import {
  LATEST_LOG_EXTRACTION_DEFAULTS,
  LOG_EXTRACTION_FREQUENCY_DEFAULT,
  LOG_EXTRACTION_LOOKBACK_PERIOD_DEFAULT,
  LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT,
} from '../saved_objects';
import { DEFAULT_CONFIG_BY_TYPE, getMergedConfig } from './merge_config';

const ALL_TYPES: readonly EntityType[] = ['user', 'host', 'service', 'generic'];

describe('getMergedConfig', () => {
  describe('with nothing overridden anywhere', () => {
    it('is a no-op for existing deployments: every entity type resolves to the built-in defaults', () => {
      for (const type of ALL_TYPES) {
        expect(getMergedConfig(type, {}, undefined)).toEqual(LATEST_LOG_EXTRACTION_DEFAULTS);
      }
    });

    it('resolves the same config for all four entity types', () => {
      const [first, ...rest] = ALL_TYPES.map((type) => getMergedConfig(type, {}, undefined));
      for (const config of rest) {
        expect(config).toEqual(first);
      }
    });
  });

  describe('layer precedence', () => {
    it('lets a store-wide override win over the code default', () => {
      const merged = getMergedConfig('user', { frequency: '5m' }, undefined);

      expect(merged).toEqual({ ...LATEST_LOG_EXTRACTION_DEFAULTS, frequency: '5m' });
    });

    it('lets a per entity-type override win over a store-wide override', () => {
      const merged = getMergedConfig('user', { frequency: '5m' }, { frequency: '10m' });

      expect(merged).toEqual({ ...LATEST_LOG_EXTRACTION_DEFAULTS, frequency: '10m' });
    });

    it('composes a store-wide override on one field with a per entity-type override on another', () => {
      const merged = getMergedConfig('user', { frequency: '5m' }, { lookbackPeriod: '6h' });

      expect(merged).toEqual({
        ...LATEST_LOG_EXTRACTION_DEFAULTS,
        frequency: '5m',
        lookbackPeriod: '6h',
      });
    });

    it('ignores a per entity-type override that targets a different entity type', () => {
      const hostOverride = { frequency: '10m' };

      expect(getMergedConfig('user', {}, undefined)).toEqual(LATEST_LOG_EXTRACTION_DEFAULTS);
      expect(getMergedConfig('host', {}, hostOverride)).toEqual({
        ...LATEST_LOG_EXTRACTION_DEFAULTS,
        frequency: '10m',
      });
    });
  });

  describe('cleared and absent fields', () => {
    it('falls through a null per entity-type field to the store-wide value', () => {
      const merged = getMergedConfig('user', { frequency: '5m' }, { frequency: null });

      expect(merged.frequency).toBe('5m');
      expect(merged).toEqual({ ...LATEST_LOG_EXTRACTION_DEFAULTS, frequency: '5m' });
    });

    it('falls through a null per entity-type field to the code default when nothing is set store-wide', () => {
      const merged = getMergedConfig('user', {}, { frequency: null });

      expect(merged.frequency).toBe(LOG_EXTRACTION_FREQUENCY_DEFAULT);
      expect(merged).toEqual(LATEST_LOG_EXTRACTION_DEFAULTS);
    });

    it('ignores undefined values in a layer instead of clobbering the layer below', () => {
      const merged = getMergedConfig(
        'user',
        { frequency: '5m', lookbackPeriod: '6h' },
        { frequency: undefined }
      );

      expect(merged).toEqual({
        ...LATEST_LOG_EXTRACTION_DEFAULTS,
        frequency: '5m',
        lookbackPeriod: '6h',
      });
    });
  });

  describe('per entity-type code defaults', () => {
    const seededTypes: readonly EntityType[] = ['user'];
    const saved = new Map<EntityType, Partial<LogExtractionConfig> | undefined>();

    beforeEach(() => {
      for (const type of seededTypes) {
        saved.set(type, DEFAULT_CONFIG_BY_TYPE[type]);
      }
    });

    afterEach(() => {
      for (const type of seededTypes) {
        const previous = saved.get(type);
        if (previous === undefined) {
          delete DEFAULT_CONFIG_BY_TYPE[type];
        } else {
          DEFAULT_CONFIG_BY_TYPE[type] = previous;
        }
      }
      saved.clear();
    });

    it('ships empty, so no entity type currently deviates from the store-wide code defaults', () => {
      expect(Object.keys(DEFAULT_CONFIG_BY_TYPE)).toEqual([]);
    });

    it('lets a seeded per entity-type default win over the store-wide code default', () => {
      DEFAULT_CONFIG_BY_TYPE.user = { frequency: '2m' };

      expect(getMergedConfig('user', {}, undefined)).toEqual({
        ...LATEST_LOG_EXTRACTION_DEFAULTS,
        frequency: '2m',
      });
      expect(getMergedConfig('host', {}, undefined)).toEqual(LATEST_LOG_EXTRACTION_DEFAULTS);
    });

    it('lets a store-wide override win over a seeded per entity-type default', () => {
      DEFAULT_CONFIG_BY_TYPE.user = { frequency: '2m' };

      expect(getMergedConfig('user', { frequency: '5m' }, undefined)).toEqual({
        ...LATEST_LOG_EXTRACTION_DEFAULTS,
        frequency: '5m',
      });
    });
  });

  describe('non-string fields', () => {
    it('round-trips numbers, arrays and enums through the merge', () => {
      const merged = getMergedConfig(
        'user',
        { maxLogsPerWindow: 250_000, additionalIndexPatterns: ['logs-*'] },
        { maxLogsPerWindowCapBehavior: 'defer', docsLimit: 42 }
      );

      expect(merged).toEqual({
        ...LATEST_LOG_EXTRACTION_DEFAULTS,
        maxLogsPerWindow: 250_000,
        additionalIndexPatterns: ['logs-*'],
        maxLogsPerWindowCapBehavior: 'defer',
        docsLimit: 42,
      });
    });

    it('keeps the default numeric and enum values when no layer speaks to them', () => {
      const merged = getMergedConfig('user', {}, {});

      expect(merged.maxLogsPerWindow).toBe(LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT);
      expect(merged.lookbackPeriod).toBe(LOG_EXTRACTION_LOOKBACK_PERIOD_DEFAULT);
      expect(merged.maxLogsPerWindowCapBehavior).toBe('drop');
    });
  });

  describe('validation of the merged result', () => {
    it('throws when a layer supplies a value that is not a valid duration string', () => {
      expect(() => getMergedConfig('user', { frequency: 'nonsense' }, undefined)).toThrow();
    });

    it('throws when a layer supplies a number outside the schema bounds', () => {
      expect(() => getMergedConfig('user', {}, { docsLimit: 0 })).toThrow();
    });
  });

  describe('single mode', () => {
    it('resolves to the code defaults when nothing is overridden', () => {
      expect(getMergedConfig('user', {}, undefined, 'single')).toEqual(
        LATEST_LOG_EXTRACTION_DEFAULTS
      );
    });

    it('is the default extractionMode', () => {
      expect(getMergedConfig('user', {}, undefined)).toEqual(
        getMergedConfig('user', {}, undefined, 'single')
      );
    });

    it('applies a global override', () => {
      const merged = getMergedConfig('user', { frequency: '5m' }, undefined, 'single');

      expect(merged.frequency).toBe('5m');
    });

    it('all typeOverride fields flow through in single mode', () => {
      const merged = getMergedConfig(
        'user',
        {},
        { maxLogsPerWindowCapBehavior: 'defer', frequency: '10m' },
        'single'
      );

      expect(merged.maxLogsPerWindowCapBehavior).toBe('defer');
      expect(merged.frequency).toBe('10m');
    });

    it('typeOverride wins over global override in single mode', () => {
      const merged = getMergedConfig('user', { frequency: '2m' }, { frequency: '10m' }, 'single');

      expect(merged.frequency).toBe('10m');
    });

    it('null in typeOverride falls through to the global override in single mode', () => {
      const merged = getMergedConfig('user', { frequency: '5m' }, { frequency: null }, 'single');

      expect(merged.frequency).toBe('5m');
    });
  });

  describe('non-priority merge stack', () => {
    it('resolves maxLogsPerWindowCapBehavior to drop from mode defaults when nothing is set', () => {
      const merged = getMergedConfig('user', {}, undefined, 'nonPriority');

      expect(merged.maxLogsPerWindowCapBehavior).toBe('drop');
    });

    it('logExtractionConfig mode-specific fields do not bleed into non-priority', () => {
      // An operator sets defer on the shared config (e.g. during single mode). For the
      // non-priority process this must not override the mode default of drop.
      const merged = getMergedConfig(
        'user',
        {},
        { maxLogsPerWindowCapBehavior: 'defer' },
        'nonPriority'
      );

      expect(merged.maxLogsPerWindowCapBehavior).toBe('drop');
    });

    it('logExtractionConfig shared fields flow through for non-priority', () => {
      const merged = getMergedConfig(
        'user',
        {},
        { additionalIndexPatterns: ['custom-*'], excludedIndexPatterns: ['exclude-*'] },
        'nonPriority'
      );

      expect(merged.additionalIndexPatterns).toEqual(['custom-*']);
      expect(merged.excludedIndexPatterns).toEqual(['exclude-*']);
    });

    it('global override of non-exclusive fields (frequency) still reaches non-priority', () => {
      const merged = getMergedConfig('user', { frequency: '5m' }, undefined, 'nonPriority');

      expect(merged.frequency).toBe('5m');
    });

    it('global override of exclusive fields does not reach non-priority', () => {
      const merged = getMergedConfig(
        'user',
        {
          maxLogsPerWindowCapBehavior: 'defer',
          maxLogsPerWindow: 999,
          maxLogsPerPage: 999,
          docsLimit: 999,
        },
        undefined,
        'nonPriority'
      );

      // exclusive fields stay at their mode defaults / code defaults
      expect(merged.maxLogsPerWindowCapBehavior).toBe('drop');
      expect(merged.maxLogsPerWindow).not.toBe(999);
      expect(merged.maxLogsPerPage).not.toBe(999);
      expect(merged.docsLimit).not.toBe(999);
    });

    it('global override of exclusive fields still reaches single and priority modes', () => {
      const overrides = { maxLogsPerWindowCapBehavior: 'defer' as const, maxLogsPerWindow: 999 };

      expect(
        getMergedConfig('user', overrides, undefined, 'single').maxLogsPerWindowCapBehavior
      ).toBe('defer');
      expect(getMergedConfig('user', overrides, undefined, 'single').maxLogsPerWindow).toBe(999);
      expect(
        getMergedConfig('user', overrides, undefined, 'priority').maxLogsPerWindowCapBehavior
      ).toBe('defer');
      expect(getMergedConfig('user', overrides, undefined, 'priority').maxLogsPerWindow).toBe(999);
    });

    it('priority still reads all typeOverride fields including maxLogsPerWindowCapBehavior', () => {
      const merged = getMergedConfig(
        'user',
        {},
        { maxLogsPerWindowCapBehavior: 'drop' },
        'priority'
      );

      expect(merged.maxLogsPerWindowCapBehavior).toBe('drop');
    });
  });

  describe('nonPriorityOverride (5th argument)', () => {
    it('nonPriorityOverride wins over mode defaults for non-priority', () => {
      const merged = getMergedConfig('user', {}, undefined, 'nonPriority', {
        maxLogsPerWindowCapBehavior: 'defer',
      });

      expect(merged.maxLogsPerWindowCapBehavior).toBe('defer');
    });

    it('nonPriorityOverride wins over global override for non-priority', () => {
      const merged = getMergedConfig('user', { frequency: '10m' }, undefined, 'nonPriority', {
        frequency: '3m',
      });

      expect(merged.frequency).toBe('3m');
    });

    it('null in nonPriorityOverride falls through to global override', () => {
      const merged = getMergedConfig('user', { frequency: '10m' }, undefined, 'nonPriority', {
        frequency: null,
      });

      expect(merged.frequency).toBe('10m');
    });

    it('null in nonPriorityOverride falls through to mode default', () => {
      const merged = getMergedConfig('user', {}, undefined, 'nonPriority', {
        maxLogsPerWindowCapBehavior: null,
      });

      expect(merged.maxLogsPerWindowCapBehavior).toBe('drop');
    });

    it('nonPriorityOverride has no effect in priority mode', () => {
      const merged = getMergedConfig('user', {}, undefined, 'priority', {
        maxLogsPerWindowCapBehavior: 'drop',
      });

      // priority mode reads from typeOverride, not nonPriorityOverride — mode default for priority is defer
      expect(merged.maxLogsPerWindowCapBehavior).toBe('defer');
    });
  });
});
