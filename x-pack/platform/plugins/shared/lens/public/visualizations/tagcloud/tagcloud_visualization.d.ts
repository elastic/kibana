import type { ThemeServiceStart } from '@kbn/core/public';
import type { PaletteRegistry } from '@kbn/coloring';
import type { FormatFactory } from '@kbn/visualization-ui-components';
import type { Visualization } from '../..';
import type { TagcloudState } from './types';
export declare const getTagcloudVisualization: ({ paletteService, kibanaTheme, formatFactory, }: {
    paletteService: PaletteRegistry;
    kibanaTheme: ThemeServiceStart;
    formatFactory: FormatFactory;
}) => Visualization<TagcloudState>;
