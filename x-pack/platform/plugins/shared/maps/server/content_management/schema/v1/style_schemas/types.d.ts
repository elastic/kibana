import type { TypeOf } from '@kbn/config-schema';
import type { EMSVectorTileStyleSchema, heatmapStyleSchema, styleSchema } from './style_schemas';
export type EMSVectorTileStyleDescriptor = TypeOf<typeof EMSVectorTileStyleSchema>;
export type HeatmapStyleDescriptor = TypeOf<typeof heatmapStyleSchema>;
export type StyleDescriptor = TypeOf<typeof styleSchema>;
