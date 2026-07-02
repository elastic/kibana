/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { chartTypeRegistry } from './chart_type_registry';
import {
  capabilityForErrorPath,
  computeCapabilityCoverage,
  configUsesCapability,
  getCapabilityIndex,
  getCoreSchema,
  getSchemaFragments,
  resolveCapabilitySelector,
} from './capabilities';

const XY = SupportedChartType.XY;
const xyManifest = chartTypeRegistry[XY].capabilities ?? {};
const xyCapabilityNames = Object.keys(xyManifest);

describe('XY capability manifest', () => {
  describe('anti-drift: coverage', () => {
    it('claims every leaf of the converted schema by exactly one capability or core', () => {
      const coverage = computeCapabilityCoverage(XY);
      expect(coverage).toBeDefined();
      // A non-empty list means the upstream XY schema gained (or moved) fields:
      // assign each printed path to a capability or to coreSelectors in
      // chart_type_registry.ts.
      expect(coverage?.unclaimed).toEqual([]);
      expect(coverage?.conflicts).toEqual([]);
    });
  });

  describe('anti-drift: selector validity', () => {
    it('resolves every capability selector to a schema node', () => {
      for (const capability of Object.values(xyManifest)) {
        for (const selector of capability.select) {
          // resolveCapabilitySelector throws a descriptive error on drift
          expect(isNodeDefined(resolveCapabilitySelector(XY, selector))).toBe(true);
        }
      }
    });

    it('resolves every core selector to a schema node', () => {
      for (const selector of chartTypeRegistry[XY].coreSelectors ?? []) {
        expect(isNodeDefined(resolveCapabilitySelector(XY, selector))).toBe(true);
      }
    });

    it('produces one fragment subtree per selector', () => {
      const fragments = getSchemaFragments(XY, xyCapabilityNames) ?? [];
      expect(fragments.map(({ name }) => name)).toEqual(xyCapabilityNames);
      for (const fragment of fragments) {
        expect(Object.keys(fragment.subtrees)).toHaveLength(
          xyManifest[fragment.name].select.length
        );
      }
    });
  });

  describe('anti-drift: generated artifacts snapshot', () => {
    it('capability index', () => {
      expect(getCapabilityIndex(XY)).toMatchSnapshot();
    });

    it('fragment names, subtree paths, and $def closures', () => {
      const fragments = getSchemaFragments(XY, xyCapabilityNames) ?? [];
      const shape = Object.fromEntries(
        fragments.map(({ name, kind, subtrees, defs }) => [
          name,
          { kind, subtrees: Object.keys(subtrees), defs: Object.keys(defs).sort() },
        ])
      );
      expect(shape).toMatchSnapshot();
    });

    it('core schema keeps only unclaimed subtrees', () => {
      const core = getCoreSchema(XY) as {
        $ref: string;
        $defs: Record<string, { properties: object }>;
      };
      expect(core).toBeDefined();
      const rootName = core.$ref.replace('#/$defs/', '');
      expect(Object.keys(core.$defs[rootName].properties)).toEqual([
        'type',
        'title',
        'description',
        'layers',
      ]);
      // The layer keeps only its (core) series type; all data/presentation
      // fields are claimed by capabilities.
      const serialized = JSON.stringify(core);
      expect(serialized).not.toContain('"legend"');
      expect(serialized).not.toContain('"data_source"');
      expect(serialized).toContain('"layers"');
      expect(core).toMatchSnapshot();
    });
  });

  describe('fragments are self-contained', () => {
    it('every $ref inside a fragment resolves within its own defs', () => {
      const fragments = getSchemaFragments(XY, xyCapabilityNames) ?? [];
      for (const fragment of fragments) {
        const refs = new Set<string>();
        collectRefs({ subtrees: fragment.subtrees, defs: fragment.defs }, refs);
        for (const ref of refs) {
          expect(fragment.defs).toHaveProperty([ref]);
        }
      }
    });

    it('skips unknown capability names', () => {
      const fragments = getSchemaFragments(XY, ['coloring', 'bogus', 'coloring']);
      expect(fragments?.map(({ name }) => name)).toEqual(['coloring']);
    });
  });

  describe('branch selectors', () => {
    it('selects a union member by const discriminator value', () => {
      expect(
        resolveCapabilitySelector(XY, {
          pointer: '/properties/legend',
          branch: { key: 'placement', value: 'inside' },
        })
      ).toEqual({ $ref: '#/$defs/xyLegendInside' });
    });

    it('selects a union member when the discriminator is an enum of consts', () => {
      expect(
        resolveCapabilitySelector(XY, {
          pointer: '/properties/legend',
          branch: { key: 'position', value: 'left' },
        })
      ).toEqual({ $ref: '#/$defs/xyLegendOutsideVertical' });
    });

    it('throws when the discriminator matches more than one member', () => {
      expect(() =>
        resolveCapabilitySelector(XY, {
          pointer: '/properties/legend',
          branch: { key: 'placement', value: 'outside' },
        })
      ).toThrow(/matched 2 union members/);
    });

    it('throws when the discriminator matches no member', () => {
      expect(() =>
        resolveCapabilitySelector(XY, {
          pointer: '/properties/legend',
          branch: { key: 'placement', value: 'nope' },
        })
      ).toThrow(/matched 0 union members/);
    });

    it('throws on pointers that select union branches by index', () => {
      expect(() => resolveCapabilitySelector(XY, '/properties/legend/anyOf/0')).toThrow(
        /unsupported segment "anyOf"/
      );
    });
  });

  describe('capabilityForErrorPath', () => {
    it.each([
      ['layers.0.data_source.query', 'layer_data'],
      ['layers.0.x.column', 'layer_data'],
      ['layers.2.y.1.color.type', 'coloring'],
      ['layers.0.breakdown_by.color.mapping', 'coloring'],
      ['legend.position', 'legend'],
      ['legend', 'legend'],
      ['axis.y.domain.min', 'axes'],
      ['layers.0.y.0.axis', 'axes'],
      ['layers.0.x.label', 'labels'],
      ['layers.0.y.0.format.decimals', 'value_formatting'],
      ['styling.fitting.type', 'fitting'],
      ['styling.interpolation', 'styling'],
      ['filters.0.condition.field', 'panel_filters'],
    ])('maps %s to %s', (path, expected) => {
      expect(capabilityForErrorPath(XY, path)).toBe(expected);
    });

    it('accepts array paths with numeric segments', () => {
      expect(capabilityForErrorPath(XY, ['layers', 0, 'y', 1, 'color', 'type'])).toBe('coloring');
    });

    it('returns undefined for core-owned paths', () => {
      expect(capabilityForErrorPath(XY, 'title')).toBeUndefined();
      expect(capabilityForErrorPath(XY, 'layers.0.type')).toBeUndefined();
    });

    it('returns undefined for unknown paths and paths above any claim', () => {
      expect(capabilityForErrorPath(XY, 'nonexistent.path')).toBeUndefined();
      expect(capabilityForErrorPath(XY, 'layers')).toBeUndefined();
    });

    it('does not treat property names as array indices', () => {
      // matcher layers/*/x/column must not match a non-numeric layer segment
      expect(capabilityForErrorPath(XY, 'layers.x.column')).toBeUndefined();
    });
  });

  describe('configUsesCapability', () => {
    const config = {
      type: 'xy',
      title: 'Requests over time',
      layers: [
        {
          type: 'line',
          data_source: { type: 'esql', query: 'FROM logs-* | STATS c = COUNT(*) BY minute' },
          x: { column: 'minute' },
          y: [{ column: 'c', color: { type: 'static', color: '#54B399' } }],
        },
      ],
    };

    const usageExpectations: Array<[string, boolean]> = [
      ['layer_data', true],
      ['coloring', true],
      ['legend', false],
      ['labels', false],
      ['value_formatting', false],
      ['axes', false],
      ['panel_filters', false],
    ];
    it.each(usageExpectations)(
      '%s → %s for a minimal line chart with a static color',
      (name, expected) => {
        expect(configUsesCapability(XY, config, name)).toBe(expected);
      }
    );

    it('detects capabilities carried on nested array items', () => {
      const withFormat = {
        ...config,
        layers: [{ ...config.layers[0], y: [{ column: 'c', format: { type: 'number' } }] }],
      };
      expect(configUsesCapability(XY, withFormat, 'value_formatting')).toBe(true);
      expect(configUsesCapability(XY, withFormat, 'coloring')).toBe(false);
    });

    it('detects root-level capabilities', () => {
      expect(
        configUsesCapability(XY, { ...config, legend: { placement: 'inside' } }, 'legend')
      ).toBe(true);
    });

    it('returns false for unknown capability names', () => {
      expect(configUsesCapability(XY, config, 'bogus')).toBe(false);
    });
  });

  describe('chart types without a manifest', () => {
    const chartType = SupportedChartType.Metric;

    it('returns undefined/false from every accessor', () => {
      expect(getCapabilityIndex(chartType)).toBeUndefined();
      expect(getSchemaFragments(chartType, ['anything'])).toBeUndefined();
      expect(getCoreSchema(chartType)).toBeUndefined();
      expect(computeCapabilityCoverage(chartType)).toBeUndefined();
      expect(capabilityForErrorPath(chartType, 'title')).toBeUndefined();
      expect(configUsesCapability(chartType, { title: 't' }, 'anything')).toBe(false);
    });
  });
});

function isNodeDefined(node: unknown): boolean {
  return typeof node === 'object' && node !== null && Object.keys(node).length > 0;
}

function collectRefs(node: unknown, into: Set<string>): void {
  if (Array.isArray(node)) {
    node.forEach((item) => collectRefs(item, into));
    return;
  }
  if (typeof node !== 'object' || node === null) return;
  const { $ref } = node as { $ref?: unknown };
  if (typeof $ref === 'string' && $ref.startsWith('#/$defs/')) {
    into.add($ref.slice('#/$defs/'.length));
  }
  Object.values(node).forEach((value) => collectRefs(value, into));
}
