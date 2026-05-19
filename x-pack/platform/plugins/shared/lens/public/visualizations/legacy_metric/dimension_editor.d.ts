import type { PaletteRegistry } from '@kbn/coloring';
import React from 'react';
import type { LegacyMetricState, VisualizationDimensionEditorProps } from '@kbn/lens-common';
export declare function MetricDimensionEditor(props: VisualizationDimensionEditorProps<LegacyMetricState> & {
    paletteService: PaletteRegistry;
}): React.JSX.Element | null;
