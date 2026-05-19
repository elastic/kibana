import React from 'react';
import type { PaletteRegistry } from '@kbn/coloring';
import type { KbnPalettes } from '@kbn/palettes';
import type { VisualizationDimensionEditorProps, DatatableVisualizationState } from '@kbn/lens-common';
import type { FormatFactory } from '../../../../common/types';
export type TableDimensionEditorProps = VisualizationDimensionEditorProps<DatatableVisualizationState> & {
    paletteService: PaletteRegistry;
    palettes: KbnPalettes;
    isDarkMode: boolean;
    formatFactory: FormatFactory;
};
export declare function TableDimensionEditor(props: TableDimensionEditorProps): React.JSX.Element | null;
export declare function TableDimensionDataExtraEditor(props: VisualizationDimensionEditorProps<DatatableVisualizationState> & {
    paletteService: PaletteRegistry;
}): React.JSX.Element | null;
