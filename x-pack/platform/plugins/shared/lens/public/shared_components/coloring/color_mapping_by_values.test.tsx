/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { ColorMappingByValues } from './color_mapping_by_values';

jest.mock('./palette_panel_container', () => ({
  PalettePanelContainer: ({ palette }: { palette: string[]; children?: React.ReactNode }) => (
    <div data-test-subj="mock-palette-panel" data-palette={palette.join('|')} />
  ),
}));

describe('ColorMappingByValues', () => {
  const paletteService = chartPluginMock.createPaletteRegistry();

  it('resolves named palette colors for the summary preview', () => {
    const palette: PaletteOutput<CustomPaletteParams> = {
      type: 'palette',
      name: 'status',
    };

    render(
      <ColorMappingByValues
        palette={palette}
        setPalette={jest.fn()}
        paletteService={paletteService}
        panelRef={{ current: null }}
        dataBounds={{ min: 0, max: 100 }}
      />
    );

    expect(screen.getByTestId('mock-palette-panel')).toHaveAttribute(
      'data-palette',
      expect.stringContaining('|')
    );
  });
});
