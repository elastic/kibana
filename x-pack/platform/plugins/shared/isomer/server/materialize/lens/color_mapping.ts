/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ColorMapping } from '@kbn/coloring';
import type { KbnPaletteId } from '@kbn/palettes';
import type { LensApiColorMapping } from './types';

type ColorDef = Extract<LensApiColorMapping, { mode: 'categorical' }>['mapping'][number]['color'];
type ApiValue = Extract<
  LensApiColorMapping,
  { mode: 'categorical' }
>['mapping'][number]['values'][number];

const DEFAULT_PALETTE = 'default';
/** Lens's prefix for a color mapping that names a legacy palette instead. */
export const LEGACY_PALETTE_PREFIX = 'LEGACY_PALETTE_';

const toColor = (color: ColorDef): ColorMapping.CategoricalColor | ColorMapping.ColorCode =>
  color.type === 'color_code'
    ? { type: 'colorCode', colorCode: color.value }
    : {
        type: 'categorical',
        paletteId: (color.palette ?? DEFAULT_PALETTE) as KbnPaletteId,
        colorIndex: color.index,
      };

const toStateValue = (value: ApiValue): unknown => {
  if (value !== null && typeof value === 'object' && 'type' in value) {
    if (value.type === 'multi_field_key') {
      return { ...value, type: 'multiFieldKey' };
    }
    if (value.type === 'range_key') {
      const { from, to, ranges } = value;
      return {
        type: 'rangeKey',
        from: from ?? null,
        to: to ?? null,
        ranges: ranges.map(({ label, from: rangeFrom, to: rangeTo }) => ({
          from: rangeFrom ?? null,
          to: rangeTo ?? null,
          label,
        })),
      };
    }
  }
  return value;
};

const toRules = (values: ApiValue[]): ColorMapping.ColorRule[] =>
  values.map((value) => ({ type: 'raw', value: toStateValue(value) } as ColorMapping.ColorRule));

/**
 * A Lens API color mapping as the color mapping config Kibana's charts color with, as Lens's API
 * transform builds it. A legacy palette has no color mapping config; its name is returned instead.
 */
export const toColorMappingConfig = (
  colorMapping: LensApiColorMapping
): { config: ColorMapping.Config } | { legacyPalette: string } => {
  if (colorMapping.palette.includes(LEGACY_PALETTE_PREFIX)) {
    return { legacyPalette: colorMapping.palette.replace(LEGACY_PALETTE_PREFIX, '') };
  }
  const specialAssignments: ColorMapping.SpecialAssignment[] = [
    {
      rules: [{ type: 'other' }],
      color: colorMapping.unassigned ? toColor(colorMapping.unassigned) : { type: 'loop' },
    },
  ];
  if (colorMapping.mode === 'categorical') {
    return {
      config: {
        paletteId: colorMapping.palette as KbnPaletteId,
        colorMode: { type: 'categorical' },
        assignments: colorMapping.mapping.map(({ values, color }) => ({
          rules: toRules(values),
          color: toColor(color),
        })),
        specialAssignments,
      },
    };
  }
  return {
    config: {
      paletteId: colorMapping.palette as KbnPaletteId,
      colorMode: {
        type: 'gradient',
        steps: (colorMapping.gradient ?? []).map(toColor),
        sort: colorMapping.sort ?? 'asc',
      },
      assignments: (colorMapping.mapping ?? []).map(({ values }) => ({
        rules: toRules(values),
        color: { type: 'gradient' },
      })),
      specialAssignments,
    } as ColorMapping.Config,
  };
};
