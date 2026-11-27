/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  getKiGraphKindGlyphAppearance,
  getKiGraphNodeMinimapColor,
  getKiGraphSubtypeAccentColor,
} from './ki_graph_glyph_styles';
import {
  KI_GRAPH_DOCUMENT_KIND_ICON,
  KI_GRAPH_MEMORY_ICON,
  KI_GRAPH_WORKFLOW_ICON,
} from './ki_graph_node_icon';
import type { KiGraphNodeKind } from './types';

const mockEuiTheme = {
  colors: {
    primary: '#primary',
    accent: '#accent',
    vis: {
      euiColorVis0: '#vis0',
      euiColorVis1: '#vis1',
      euiColorVis2: '#vis2',
      euiColorVis3: '#vis3',
      euiColorVis4: '#vis4-memory',
      euiColorVis5: '#vis5',
      euiColorVis6: '#vis6',
      euiColorVis7: '#vis7-document',
      euiColorVis8: '#vis8',
      euiColorVis9: '#vis9',
    },
  },
} as UseEuiTheme['euiTheme'];

describe('getKiGraphSubtypeAccentColor', () => {
  const kinds: KiGraphNodeKind[] = ['fact', 'entity', 'memory', 'document', 'workflow', 'crawler'];

  it('returns stable accent colors for every kind', () => {
    for (const kind of kinds) {
      const color = getKiGraphSubtypeAccentColor(mockEuiTheme, kind, 'subtype-a');
      expect(color.startsWith('#')).toBe(true);
    }
  });

  it('uses kind-level accents for memory, document and workflow', () => {
    expect(getKiGraphSubtypeAccentColor(mockEuiTheme, 'memory', 'x')).toBe('#vis4-memory');
    expect(getKiGraphSubtypeAccentColor(mockEuiTheme, 'document', 'y')).toBe('#vis7-document');
    expect(getKiGraphSubtypeAccentColor(mockEuiTheme, 'workflow', 'z')).toBe('#accent');
    expect(getKiGraphSubtypeAccentColor(mockEuiTheme, 'crawler', '')).toBe('#vis2');
  });

  it('uses primary for entity user subtype and vis6 for empty fact', () => {
    expect(getKiGraphSubtypeAccentColor(mockEuiTheme, 'entity', 'user')).toBe('#primary');
    expect(getKiGraphSubtypeAccentColor(mockEuiTheme, 'fact', '')).toBe('#vis6');
  });
});

describe('getKiGraphNodeMinimapColor', () => {
  it('matches subtype accent color', () => {
    expect(getKiGraphNodeMinimapColor(mockEuiTheme, 'workflow', '')).toBe(
      getKiGraphSubtypeAccentColor(mockEuiTheme, 'workflow', '')
    );
  });
});

describe('getKiGraphKindGlyphAppearance', () => {
  it('pairs icon and accent for legend rows', () => {
    expect(getKiGraphKindGlyphAppearance(mockEuiTheme, 'memory', 'relationship')).toEqual({
      icon: KI_GRAPH_MEMORY_ICON,
      accentColor: '#vis4-memory',
    });
    expect(getKiGraphKindGlyphAppearance(mockEuiTheme, 'document', 'article')).toEqual({
      icon: KI_GRAPH_DOCUMENT_KIND_ICON,
      accentColor: '#vis7-document',
    });
    expect(getKiGraphKindGlyphAppearance(mockEuiTheme, 'workflow', '')).toEqual({
      icon: KI_GRAPH_WORKFLOW_ICON,
      accentColor: '#accent',
    });
  });
});
