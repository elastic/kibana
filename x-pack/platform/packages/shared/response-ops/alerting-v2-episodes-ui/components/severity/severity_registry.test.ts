/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildSeverityRegistry,
  toSeverityRegistryMap,
  createSeverityRankResolver,
} from './severity_registry';
import { CLASSIC_SEVERITY_EXTENSIONS } from '../../classic_alerts/create_classic_episode_source';

describe('severity_registry', () => {
  describe('buildSeverityRegistry', () => {
    it('returns built-in severities when no extensions are provided', () => {
      const entries = buildSeverityRegistry();
      expect(entries.map((e) => e.value)).toEqual(['info', 'low', 'medium', 'high', 'critical']);
    });

    it('includes extension severities merged with built-ins, sorted by rank', () => {
      const entries = buildSeverityRegistry(CLASSIC_SEVERITY_EXTENSIONS);

      const values = entries.map((e) => e.value);
      expect(values).toEqual([
        'info',
        'low',
        'warning',
        'medium',
        'minor',
        'high',
        'major',
        'critical',
      ]);
    });

    it('preserves extension properties on merged entries', () => {
      const entries = buildSeverityRegistry([CLASSIC_SEVERITY_EXTENSIONS[0]]);

      const warningEntry = entries.find((e) => e.value === 'warning');
      expect(warningEntry).toEqual({
        value: 'warning',
        label: 'Warning',
        color: 'warning',
        sortRank: 1,
        filterDotColor: 'textWarning',
      });
    });
  });

  describe('toSeverityRegistryMap', () => {
    it('creates a map keyed by severity value', () => {
      const entries = buildSeverityRegistry();
      const map = toSeverityRegistryMap(entries);

      expect(map.get('critical')?.label).toBe('Critical');
      expect(map.get('info')?.sortRank).toBe(0);
      expect(map.get('nonexistent')).toBeUndefined();
    });
  });

  describe('createSeverityRankResolver', () => {
    it('resolves built-in severity ranks', () => {
      const map = toSeverityRegistryMap(buildSeverityRegistry());
      const resolver = createSeverityRankResolver(map);

      expect(resolver('critical')).toBe(4);
      expect(resolver('info')).toBe(0);
    });

    it('resolves extension severity ranks', () => {
      const entries = buildSeverityRegistry(CLASSIC_SEVERITY_EXTENSIONS);
      const resolver = createSeverityRankResolver(toSeverityRegistryMap(entries));

      expect(resolver('warning')).toBe(1);
    });

    it('returns -1 for unknown severities', () => {
      const resolver = createSeverityRankResolver(toSeverityRegistryMap(buildSeverityRegistry()));

      expect(resolver('unknown')).toBe(-1);
      expect(resolver(null)).toBe(-1);
      expect(resolver(undefined)).toBe(-1);
    });
  });
});
