/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { bucketInterval, toChartGlyph } from './shared';

describe('toChartGlyph', () => {
  it.each([
    ['alert', 'alert'],
    ['circle', 'circle'],
    ['pin_filled', 'pinFilled'],
    ['map_marker', 'marker'],
    ['editor_comment', 'comment'],
    ['compute', 'processor'],
    ['star_empty', 'star'],
    ['star_filled', 'starFilled'],
    ['sort_up', 'sortUp'],
    ['popout', 'external'],
  ])('maps the Lens icon %s to the %s glyph', (icon, glyph) => {
    expect(toChartGlyph(icon)).toBe(glyph);
  });

  it('has no glyph for an unknown or absent icon', () => {
    expect(toChartGlyph('empty')).toBeUndefined();
    expect(toChartGlyph(undefined)).toBeUndefined();
  });
});

describe('bucketInterval', () => {
  const column = (type: string, bucket?: unknown): DatatableColumn => ({
    id: 'x',
    name: 'x',
    meta: {
      type: type as DatatableColumn['meta']['type'],
      ...(bucket ? { esMeta: { bucket } } : {}),
    },
  });

  it('reads a date BUCKET as milliseconds', () => {
    expect(bucketInterval(column('date', { interval: 30, unit: 'minute' }))).toBe(1_800_000);
    expect(bucketInterval(column('date', { interval: 1, unit: 'month' }))).toBe(2_592_000_000);
  });

  it('reads a numeric BUCKET as its width', () => {
    expect(bucketInterval(column('number', { interval: 50 }))).toBe(50);
  });

  it('has no interval for an unbucketed column or an unknown unit', () => {
    expect(bucketInterval(column('date'))).toBeUndefined();
    expect(bucketInterval(column('date', { interval: 1, unit: 'fortnight' }))).toBeUndefined();
    expect(bucketInterval(undefined)).toBeUndefined();
  });
});
