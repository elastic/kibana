import React from 'react';
import type { PaletteRegistry } from '@kbn/coloring';
import type { FormatFactory } from '@kbn/visualization-ui-components';
import type { KbnPalettes } from '@kbn/palettes';
import type { LensPartitionVisualizationState, VisualizationDimensionEditorProps } from '@kbn/lens-common';
export type DimensionEditorProps = VisualizationDimensionEditorProps<LensPartitionVisualizationState> & {
    formatFactory: FormatFactory;
    paletteService: PaletteRegistry;
    palettes: KbnPalettes;
    isDarkMode: boolean;
};
export declare function DimensionEditor(props: DimensionEditorProps): React.JSX.Element | null;
export declare function DimensionDataExtraEditor(props: VisualizationDimensionEditorProps<LensPartitionVisualizationState> & {
    paletteService: PaletteRegistry;
}): React.JSX.Element | null;
