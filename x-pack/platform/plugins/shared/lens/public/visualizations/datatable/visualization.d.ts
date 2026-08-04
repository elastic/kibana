import type { ThemeServiceStart } from '@kbn/core/public';
import type { PaletteRegistry } from '@kbn/coloring';
import type { DatatableVisualizationState, Visualization } from '@kbn/lens-common';
import type { FormatFactory } from '../../../common/types';
export declare const getDatatableVisualization: ({ paletteService, kibanaTheme, formatFactory, }: {
    paletteService: PaletteRegistry;
    kibanaTheme: ThemeServiceStart;
    formatFactory: FormatFactory;
}) => Visualization<DatatableVisualizationState>;
