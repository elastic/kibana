/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow } from '@elastic/eui';
import { CustomizablePalette, PaletteRegistry } from '@kbn/coloring';
import type { VisualizationDimensionEditorProps } from '../../types';
import { PalettePanelContainer } from '../../shared_components';
import './dimension_editor.scss';
import type { HeatmapVisualizationState } from './types';
import { getSafePaletteParams } from './utils';

export function HeatmapDimensionEditor(
  props: VisualizationDimensionEditorProps<HeatmapVisualizationState> & {
    paletteService: PaletteRegistry;
  }
) {
  const { state, setState, frame, accessor, isInlineEditing } = props;

  if (state?.valueAccessor !== accessor) return null;

  const currentData = frame.activeData?.[state.layerId];

  // need to tell the helper that the colorStops are required to display
  const { displayStops, activePalette, currentMinMax } = getSafePaletteParams(
    props.paletteService,
    currentData,
    accessor,
    state?.palette && state.palette.accessor === accessor ? state.palette : undefined
  );

  return (
    <>
      <EuiFormRow
        className="lnsDynamicColoringRow"
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.paletteHeatmapGradient.label', {
          defaultMessage: 'Color',
        })}
      >
        <PalettePanelContainer
          palette={displayStops.map(({ color }) => color)}
          siblingRef={props.panelRef}
          isInlineEditing={isInlineEditing}
        >
          {activePalette && (
            <CustomizablePalette
              palettes={props.paletteService}
              activePalette={activePalette}
              dataBounds={currentMinMax}
              setPalette={(newPalette) => {
                // make sure to always have a list of stops
                if (newPalette.params && !newPalette.params.stops) {
                  newPalette.params.stops = displayStops;
                }
                (newPalette as HeatmapVisualizationState['palette'])!.accessor = accessor;
                setState({
                  ...state,
                  palette: newPalette as HeatmapVisualizationState['palette'],
                });
              }}
            />
          )}
        </PalettePanelContainer>
      </EuiFormRow>
    </>
  );
}
