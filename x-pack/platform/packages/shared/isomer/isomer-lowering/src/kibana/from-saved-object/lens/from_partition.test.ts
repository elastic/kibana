/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import lensDonut from '../../__fixtures__/lens_donut.json';
import { fromKibanaSavedObject } from '..';

describe('fromKibanaSavedObject (Partition/Donut)', () => {
  it('lowers an lnsPie saved object to an AdaptiveLens with chart.kind = "partition"', () => {
    const { lens, diagnostics } = fromKibanaSavedObject(lensDonut, {
      resolveReferenceTitle: (_name, _id, type) => (type === 'index-pattern' ? 'web-*' : undefined),
    });

    expect(lens).toBeDefined();
    expect(lens?.id).toBe('lens-donut-traffic-source');
    expect(lens?.chart.kind).toBe('partition');

    if (lens?.chart.kind === 'partition') {
      expect(lens.chart.layout).toBe('donut');
      expect(lens.chart.slices.id).toBe('col-source');
      expect(lens.chart.slices.valueField).toBe('col-count');
      // No `numberDisplay` on the fixture, no `valuesInLegend` override —
      // the converter should leave `valueDisplay` undefined so the donut
      // primitive's `'both'` default applies.
      expect(lens.chart.valueDisplay).toBeUndefined();
    }

    expect(lens?.query.esql).toContain('FROM `web-*`');
    expect(lens?.query.esql).toContain('COUNT(*)');
    expect(lens?.query.esql).toContain('BY');

    expect(diagnostics.find((d) => d.code === 'lens.formBased.lowered-to-esql')).toBeDefined();
  });

  it('maps Lens `numberDisplay` onto AdaptivePartitionChart.valueDisplay', () => {
    const buildLensWith = (numberDisplay: 'value' | 'percent' | 'hidden') => {
      const patched = JSON.parse(JSON.stringify(lensDonut));
      patched.attributes.state.visualization.numberDisplay = numberDisplay;
      return patched;
    };

    for (const display of ['value', 'percent', 'hidden'] as const) {
      const { lens } = fromKibanaSavedObject(buildLensWith(display), {
        resolveReferenceTitle: (_name, _id, type) =>
          type === 'index-pattern' ? 'web-*' : undefined,
      });
      expect(lens?.chart.kind).toBe('partition');
      if (lens?.chart.kind === 'partition') {
        expect(lens.chart.valueDisplay).toBe(display);
      }
    }
  });

  it('falls back to "percent" when `valuesInLegend: false` is the only signal', () => {
    const patched = JSON.parse(JSON.stringify(lensDonut));
    patched.attributes.state.visualization.valuesInLegend = false;

    const { lens } = fromKibanaSavedObject(patched, {
      resolveReferenceTitle: (_name, _id, type) => (type === 'index-pattern' ? 'web-*' : undefined),
    });

    expect(lens?.chart.kind).toBe('partition');
    if (lens?.chart.kind === 'partition') {
      // `valuesInLegend: false` collapses the legend to percent-only.
      expect(lens.chart.valueDisplay).toBe('percent');
    }
  });

  it('preserves waffle layout for bind-time degradation', () => {
    const patched = JSON.parse(JSON.stringify(lensDonut));
    patched.attributes.state.visualization.shape = 'waffle';

    const { lens } = fromKibanaSavedObject(patched, {
      resolveReferenceTitle: (_name, _id, type) => (type === 'index-pattern' ? 'web-*' : undefined),
    });

    expect(lens?.chart.kind).toBe('partition');
    if (lens?.chart.kind === 'partition') {
      expect(lens.chart.layout).toBe('waffle');
    }
  });

  it('preserves partition label placement', () => {
    const patched = JSON.parse(JSON.stringify(lensDonut));
    patched.attributes.state.visualization.labels = { position: 'inside' };

    const { lens } = fromKibanaSavedObject(patched, {
      resolveReferenceTitle: (_name, _id, type) => (type === 'index-pattern' ? 'web-*' : undefined),
    });

    expect(lens?.chart.kind).toBe('partition');
    if (lens?.chart.kind === 'partition') {
      expect(lens.chart.labelPosition).toBe('inside');
    }
  });

  it('preserves partition palette colors', () => {
    const patched = JSON.parse(JSON.stringify(lensDonut));
    patched.attributes.state.visualization.palette = {
      params: { colors: ['#54b399', '#6092c0', '#d36086'] },
    };

    const { lens } = fromKibanaSavedObject(patched, {
      resolveReferenceTitle: (_name, _id, type) => (type === 'index-pattern' ? 'web-*' : undefined),
    });

    expect(lens?.chart.kind).toBe('partition');
    if (lens?.chart.kind === 'partition') {
      expect(lens.chart.colors).toEqual(['#54b399', '#6092c0', '#d36086']);
    }
  });

  it('preserves Lens category color mapping assignments', () => {
    const patched = JSON.parse(JSON.stringify(lensDonut));
    patched.attributes.state.visualization.colorMapping = {
      assignments: [
        {
          rules: [{ type: 'matchExactly', values: ['google', 'youtube'] }],
          color: { type: 'colorCode', colorCode: '#00bfb3' },
        },
        {
          rules: [{ type: 'matchExactly', values: [{ value: 'twitter' }] }],
          color: '#f04e98',
        },
      ],
    };

    const { lens, diagnostics } = fromKibanaSavedObject(patched, {
      resolveReferenceTitle: (_name, _id, type) => (type === 'index-pattern' ? 'web-*' : undefined),
    });

    expect(lens?.chart.kind).toBe('partition');
    if (lens?.chart.kind === 'partition') {
      expect(lens.chart.colorMapping).toEqual({
        google: '#00bfb3',
        youtube: '#00bfb3',
        twitter: '#f04e98',
      });
    }
    expect(
      diagnostics.find((d) => d.code === 'lens.partition.color-mapping-preserved')
    ).toBeDefined();
  });

  it('resolves palette-index category color assignments', () => {
    const patched = JSON.parse(JSON.stringify(lensDonut));
    patched.attributes.state.visualization.palette = {
      params: { colors: ['#54b399', '#6092c0', '#d36086'] },
    };
    patched.attributes.state.visualization.colorMapping = {
      assignments: [
        {
          rules: [{ type: 'matchExactly', values: ['google'] }],
          color: { type: 'palette', paletteIndex: 1 },
        },
        {
          rules: [{ type: 'matchExactly', values: ['twitter'] }],
          color: { type: 'palette', colorIndex: 2 },
        },
      ],
    };

    const { lens } = fromKibanaSavedObject(patched, {
      resolveReferenceTitle: (_name, _id, type) => (type === 'index-pattern' ? 'web-*' : undefined),
    });

    expect(lens?.chart.kind).toBe('partition');
    if (lens?.chart.kind === 'partition') {
      expect(lens.chart.colorMapping).toEqual({
        google: '#6092c0',
        twitter: '#d36086',
      });
    }
  });

  it('resolves palette-index assignments against the default Elastic palette', () => {
    const patched = JSON.parse(JSON.stringify(lensDonut));
    patched.attributes.state.visualization.colorMapping = {
      assignments: [
        {
          rules: [{ type: 'matchExactly', values: ['youtube'] }],
          color: { type: 'palette', paletteIndex: 2 },
        },
      ],
    };

    const { lens } = fromKibanaSavedObject(patched, {
      resolveReferenceTitle: (_name, _id, type) => (type === 'index-pattern' ? 'web-*' : undefined),
    });

    expect(lens?.chart.kind).toBe('partition');
    if (lens?.chart.kind === 'partition') {
      expect(lens.chart.colorMapping).toEqual({
        youtube: '#D36086',
      });
    }
  });
});
