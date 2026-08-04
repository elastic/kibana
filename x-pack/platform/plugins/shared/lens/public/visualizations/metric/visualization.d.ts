import type { PaletteRegistry } from '@kbn/coloring';
import type { ThemeServiceStart } from '@kbn/core/public';
import type { Visualization, MetricVisualizationState } from '@kbn/lens-common';
export declare const DEFAULT_MAX_COLUMNS = 3;
export declare const showingBar: (state: MetricVisualizationState) => state is MetricVisualizationState & {
    showBar: true;
    maxAccessor: string;
};
export declare const getDefaultColor: (state: MetricVisualizationState, isMetricNumeric?: boolean) => string;
export declare const supportedDataTypes: Set<string>;
export declare const metricLabel: string;
export declare const getMetricVisualization: ({ paletteService, theme, }: {
    paletteService: PaletteRegistry;
    theme: ThemeServiceStart;
}) => Visualization<MetricVisualizationState>;
