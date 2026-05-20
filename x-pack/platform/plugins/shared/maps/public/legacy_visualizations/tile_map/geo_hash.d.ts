import type { BucketAggType} from '@kbn/data-plugin/common';
import { type IBucketAggConfig } from '@kbn/data-plugin/common';
export declare const GEOHASH_GRID = "geohash_grid";
export declare const getGeoHashBucketAgg: () => BucketAggType<IBucketAggConfig>;
