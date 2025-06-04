/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, MutableRefObject, useCallback } from 'react';

import { ColorMapping, PaletteOutput, PaletteRegistry } from '@kbn/coloring';
import { useDebouncedValue } from '@kbn/visualization-utils';
import { getColorCategories } from '@kbn/chart-expressions-common';
import { KbnPalettes } from '@kbn/palettes';
import type { FormatFactory } from '@kbn/visualization-ui-components';

import { getDatatableColumn } from '../../../common/expressions/impl/datatable/utils';
import { ColorMappingByTerms } from '../../shared_components/coloring/color_mapping_by_terms';
import { FramePublicAPI } from '../../types';
import type { TagcloudState } from './types';

interface Props {
  paletteService: PaletteRegistry;
  palettes: KbnPalettes;
  state: TagcloudState;
  setState: (state: TagcloudState) => void;
  frame: FramePublicAPI;
  panelRef: MutableRefObject<HTMLDivElement | null>;
  isDarkMode: boolean;
  isInlineEditing?: boolean;
  formatFactory: FormatFactory;
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
  formatFactory,
}: Props) {
  const { inputValue: localState, handleInputChange: setLocalState } =
    useDebouncedValue<TagcloudState>({
      value: state,
      onChange: setState,
    });
  const currentData = frame.activeData?.[state.layerId];
  const formatter = !state.tagAccessor
    ? undefined
    : formatFactory(getDatatableColumn(currentData, state.tagAccessor)?.meta?.params);

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

  const categories = useMemo(() => {
    return getColorCategories(currentData?.rows, state.tagAccessor);
  }, [currentData?.rows, state.tagAccessor]);

  return (
    <ColorMappingByTerms
      isDarkMode={isDarkMode}
      panelRef={panelRef}
      palettes={palettes}
      palette={state.palette}
      setPalette={setPalette}
      colorMapping={state.colorMapping}
      setColorMapping={setColorMapping}
      categories={categories}
      paletteService={paletteService}
      formatter={formatter}
      isInlineEditing={isInlineEditing}
    />
  );
}
