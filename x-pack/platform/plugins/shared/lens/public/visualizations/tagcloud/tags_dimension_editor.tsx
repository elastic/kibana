/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  PaletteRegistry,
  CategoricalColorMapping,
  DEFAULT_COLOR_MAPPING_CONFIG,
  ColorMapping,
  SPECIAL_TOKENS_STRING_CONVERSION,
  PaletteOutput,
} from '@kbn/coloring';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiSwitch, EuiFormRow, EuiText, EuiBadge } from '@elastic/eui';
import { useState, MutableRefObject, useCallback } from 'react';
import { useDebouncedValue } from '@kbn/visualization-utils';
import { getColorCategories } from '@kbn/chart-expressions-common';
import { KbnPalettes } from '@kbn/palettes';
import type { TagcloudState } from './types';
import {
  PalettePanelContainer,
  PalettePicker,
  getPaletteDisplayColors,
} from '../../shared_components';
import { FramePublicAPI } from '../../types';
import { trackUiCounterEvents } from '../../lens_ui_telemetry';

interface Props {
  paletteService: PaletteRegistry;
  palettes: KbnPalettes;
  state: TagcloudState;
  setState: (state: TagcloudState) => void;
  frame: FramePublicAPI;
  panelRef: MutableRefObject<HTMLDivElement | null>;
  isDarkMode: boolean;
  isInlineEditing?: boolean;
}

export function TagsDimensionEditor({
  state,
  frame,
  setState,
  panelRef,
  isDarkMode,
  palettes,
  paletteService,
  isInlineEditing,
}: Props) {
  const { inputValue: localState, handleInputChange: setLocalState } =
    useDebouncedValue<TagcloudState>({
      value: state,
      onChange: setState,
    });
  const [useNewColorMapping, setUseNewColorMapping] = useState(state.colorMapping ? true : false);

  const colors = getPaletteDisplayColors(
    paletteService,
    palettes,
    isDarkMode,
    state.palette,
    state.colorMapping
  );
  const table = frame.activeData?.[state.layerId];
  const splitCategories = getColorCategories(table?.rows, state.tagAccessor);

  const setColorMapping = useCallback(
    (colorMapping?: ColorMapping.Config) => {
      setLocalState({
        ...localState,
        colorMapping,
      });
    },
    [localState, setLocalState]
  );

  const setPalette = useCallback(
    (palette: PaletteOutput) => {
      setLocalState({
        ...localState,
        palette,
        colorMapping: undefined,
      });
    },
    [localState, setLocalState]
  );

  const canUseColorMapping = state.colorMapping;

  return (
    <EuiFormRow
      display="columnCompressed"
      label={i18n.translate('xpack.lens.colorMapping.editColorMappingSectionLabel', {
        defaultMessage: 'Color mapping',
      })}
      style={{ alignItems: 'center' }}
      fullWidth
    >
      <PalettePanelContainer
        palette={colors}
        siblingRef={panelRef}
        title={
          useNewColorMapping
            ? i18n.translate('xpack.lens.colorMapping.editColorMappingTitle', {
                defaultMessage: 'Assign colors to terms',
              })
            : i18n.translate('xpack.lens.colorMapping.editColorsTitle', {
                defaultMessage: 'Edit colors',
              })
        }
        isInlineEditing={isInlineEditing}
      >
        <div className="lnsPalettePanel__section lnsPalettePanel__section--shaded lnsIndexPatternDimensionEditor--padded">
          <EuiFlexGroup direction="column" gutterSize="s" justifyContent="flexStart">
            <EuiFlexItem>
              <EuiSwitch
                label={
                  <EuiText size="xs">
                    <span>
                      {i18n.translate('xpack.lens.colorMapping.tryLabel', {
                        defaultMessage: 'Use the new Color Mapping feature',
                      })}{' '}
                      <EuiBadge color="hollow">
                        {i18n.translate('xpack.lens.colorMapping.techPreviewLabel', {
                          defaultMessage: 'Tech preview',
                        })}
                      </EuiBadge>
                    </span>
                  </EuiText>
                }
                data-test-subj="lns_colorMappingOrLegacyPalette_switch"
                compressed
                checked={useNewColorMapping}
                onChange={({ target: { checked } }) => {
                  trackUiCounterEvents(`color_mapping_switch_${checked ? 'enabled' : 'disabled'}`);
                  setColorMapping(checked ? { ...DEFAULT_COLOR_MAPPING_CONFIG } : undefined);
                  setUseNewColorMapping(checked);
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              {canUseColorMapping || useNewColorMapping ? (
                <CategoricalColorMapping
                  isDarkMode={isDarkMode}
                  model={state.colorMapping ?? { ...DEFAULT_COLOR_MAPPING_CONFIG }}
                  onModelUpdate={(model: ColorMapping.Config) => setColorMapping(model)}
                  palettes={palettes}
                  data={{
                    type: 'categories',
                    categories: splitCategories,
                  }}
                  specialTokens={SPECIAL_TOKENS_STRING_CONVERSION}
                />
              ) : (
                <PalettePicker
                  palettes={paletteService}
                  activePalette={state.palette}
                  setPalette={(newPalette) => {
                    setPalette(newPalette);
                  }}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </PalettePanelContainer>
    </EuiFormRow>
  );
}
