import React from 'react';
import type { PaletteRegistry } from '@kbn/coloring';
import type { VisualizationDimensionEditorProps } from '@kbn/lens-common';
import type { GaugeVisualizationState } from './constants';
export declare function GaugeDimensionEditor(props: VisualizationDimensionEditorProps<GaugeVisualizationState> & {
    paletteService: PaletteRegistry;
}): React.JSX.Element | null;
