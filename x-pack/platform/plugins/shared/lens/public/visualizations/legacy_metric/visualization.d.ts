import type { PaletteRegistry } from '@kbn/coloring';
import type { Visualization, LegacyMetricState } from '@kbn/lens-common';
export declare const legacyMetricSupportedTypes: Set<string>;
export declare const getLegacyMetricVisualization: ({ paletteService, }: {
    paletteService: PaletteRegistry;
}) => Visualization<LegacyMetricState>;
