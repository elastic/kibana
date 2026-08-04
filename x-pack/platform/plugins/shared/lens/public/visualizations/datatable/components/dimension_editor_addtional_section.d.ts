import React from 'react';
import type { PaletteRegistry } from '@kbn/coloring';
import type { VisualizationDimensionEditorProps, DatatableVisualizationState } from '@kbn/lens-common';
export declare function TableDimensionEditorAdditionalSection(props: VisualizationDimensionEditorProps<DatatableVisualizationState> & {
    paletteService: PaletteRegistry;
}): React.JSX.Element | null;
