/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shade, tint, transparentize, type UseEuiTheme } from '@elastic/eui';
import type { KiGraphNodeKind } from './types';

const ICON_PIXEL_SIZE = 16;
const HASH_MODULUS = 2 ** 31 - 1;

export const KI_GRAPH_VIS_COLOR_COUNT = 10;

const LIGHT_FILL_TINT = 0.8;
const LIGHT_FILL_TINT_BUSY = 0.55;
const DARK_FILL_ALPHA = 0.3;
const DARK_FILL_ALPHA_BUSY = 0.48;

/** Scales the glyph icon so it stays inside the circle or hexagon body. */
export const getKiGraphGlyphIconScale = (nodeSize: number): number =>
  Math.min(1, (nodeSize * 0.46) / ICON_PIXEL_SIZE);

const normalizeSubtypeKey = (subtype: string | undefined): string =>
  subtype?.trim().toLowerCase() ?? '';

/** Stable hash of subtype string into `0 .. colorCount - 1`. */
export const hashKiGraphSubtypeToColorIndex = (
  subtype: string,
  colorCount: number = KI_GRAPH_VIS_COLOR_COUNT
): number => {
  let hash = 5381;
  for (let i = 0; i < subtype.length; i++) {
    hash = (hash * 33 + subtype.charCodeAt(i)) % HASH_MODULUS;
  }
  return Math.abs(hash) % colorCount;
};

export const getKiGraphVisPalette = (
  euiTheme: UseEuiTheme['euiTheme']
): readonly [string, ...string[]] => {
  const { vis } = euiTheme.colors;
  return [
    vis.euiColorVis0,
    vis.euiColorVis1,
    vis.euiColorVis2,
    vis.euiColorVis3,
    vis.euiColorVis4,
    vis.euiColorVis5,
    vis.euiColorVis6,
    vis.euiColorVis7,
    vis.euiColorVis8,
    vis.euiColorVis9,
  ];
};

export const getKiGraphSubtypeAccentColor = (
  euiTheme: UseEuiTheme['euiTheme'],
  kind: KiGraphNodeKind,
  subtype?: string
): string => {
  const key = normalizeSubtypeKey(subtype);
  if (kind === 'entity' && key === 'user') {
    return euiTheme.colors.primary;
  }
  if (key.length === 0) {
    return kind === 'entity' ? euiTheme.colors.primary : euiTheme.colors.vis.euiColorVis6;
  }
  const palette = getKiGraphVisPalette(euiTheme);
  const index = hashKiGraphSubtypeToColorIndex(key);
  return palette[index];
};

export const getKiGraphNodeMinimapColor = (
  euiTheme: UseEuiTheme['euiTheme'],
  kind: KiGraphNodeKind,
  subtype?: string
): string => getKiGraphSubtypeAccentColor(euiTheme, kind, subtype);

interface NodeGlyphColors {
  fill: string;
  borderColor: string;
  iconColor: string;
}

const getNodeFill = (accent: string, isEmphasized: boolean, isDark: boolean): string => {
  if (isDark) {
    const alpha = isEmphasized ? DARK_FILL_ALPHA_BUSY : DARK_FILL_ALPHA;
    return transparentize(accent, alpha);
  }
  const ratio = isEmphasized ? LIGHT_FILL_TINT_BUSY : LIGHT_FILL_TINT;
  return tint(accent, ratio);
};

export const getKiGraphNodeGlyphColors = (
  euiTheme: UseEuiTheme['euiTheme'],
  kind: KiGraphNodeKind,
  isTinted: boolean,
  isSelected: boolean,
  subtype?: string,
  isDark: boolean = false
): NodeGlyphColors => {
  const accent = getKiGraphSubtypeAccentColor(euiTheme, kind, subtype);
  const isEmphasized = isTinted || isSelected;

  const fill = getNodeFill(accent, isEmphasized, isDark);
  const restingBorderColor = shade(accent, isDark ? 0.12 : 0.08);
  const borderColor = isSelected ? accent : restingBorderColor;
  const iconColor = isDark ? tint(accent, 0.15) : shade(accent, 0.15);

  return { fill, borderColor, iconColor };
};

export const getKiGraphLegendGlyphColors = (
  euiTheme: UseEuiTheme['euiTheme'],
  kind: KiGraphNodeKind,
  isDark: boolean = false
): NodeGlyphColors => getKiGraphNodeGlyphColors(euiTheme, kind, false, false, undefined, isDark);
