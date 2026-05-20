import type { TypeOf } from '@kbn/config-schema';
import type { mapsGetResultSchema, mapsCreateOptionsSchema, mapsCreateResultSchema, mapsSearchOptionsSchema, mapsUpdateOptionsSchema } from './cm_services';
export type MapsCreateOptions = TypeOf<typeof mapsCreateOptionsSchema>;
export type MapsUpdateOptions = TypeOf<typeof mapsUpdateOptionsSchema>;
export type MapsSearchOptions = TypeOf<typeof mapsSearchOptionsSchema>;
export type MapsGetOut = TypeOf<typeof mapsGetResultSchema>;
export type MapsCreateOut = TypeOf<typeof mapsCreateResultSchema>;
export type MapsUpdateOut = TypeOf<typeof mapsCreateResultSchema>;
