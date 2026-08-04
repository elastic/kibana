import React from 'react';
import type { PaletteRegistry } from '@kbn/coloring';
import type { VisualizationDimensionEditorProps } from '@kbn/lens-common';
import type { HeatmapVisualizationState } from './types';
export declare function HeatmapDimensionEditor(props: VisualizationDimensionEditorProps<HeatmapVisualizationState> & {
    paletteService: PaletteRegistry;
}): React.JSX.Element | null;
