import React from 'react';
import type { PaletteRegistry } from '@kbn/coloring';
import type { KbnPalettes } from '@kbn/palettes';
import type { VisualizationDimensionEditorProps } from '@kbn/lens-common';
import type { XYVisualizationState } from '../types';
import type { FormatFactory } from '../../../../common/types';
export declare const idPrefix: string;
export declare function DataDimensionEditor(props: VisualizationDimensionEditorProps<XYVisualizationState> & {
    formatFactory: FormatFactory;
    paletteService: PaletteRegistry;
    palettes: KbnPalettes;
    isDarkMode: boolean;
}): React.JSX.Element | null;
export declare function DataDimensionEditorDataSectionExtra(props: VisualizationDimensionEditorProps<XYVisualizationState> & {
    formatFactory: FormatFactory;
    paletteService: PaletteRegistry;
}): React.JSX.Element | null;
