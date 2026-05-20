import type { TypeOf } from '@kbn/config-schema';
import type { attributionSchema, EMSVectorTileLayerSchema, heatmapLayerSchema, layerGroupSchema, rasterLayerSchema, vectorLayerSchema } from './layer_schemas';
export type Attribution = TypeOf<typeof attributionSchema>;
export type StoredEMSVectorTileLayer = TypeOf<typeof EMSVectorTileLayerSchema>;
export type StoredHeatmapLayer = TypeOf<typeof heatmapLayerSchema>;
export type StoredLayerGroup = TypeOf<typeof layerGroupSchema>;
export type StoredRasterLayer = TypeOf<typeof rasterLayerSchema>;
export type StoredVectorLayer = TypeOf<typeof vectorLayerSchema>;
