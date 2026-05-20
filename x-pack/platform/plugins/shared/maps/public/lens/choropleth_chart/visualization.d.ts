import type { PaletteRegistry } from '@kbn/coloring';
import type { ThemeServiceStart } from '@kbn/core/public';
import type { Visualization } from '@kbn/lens-plugin/public';
import type { ChoroplethChartState } from './types';
export declare const getVisualization: ({ paletteService, theme, }: {
    paletteService: PaletteRegistry;
    theme: ThemeServiceStart;
}) => Visualization<ChoroplethChartState>;
