import type { TileMetaFeature } from '../../../common/descriptor_types';
export declare const ES_MVT_META_LAYER_NAME = "meta";
export declare const ES_MVT_HITS_TOTAL_RELATION = "hits.total.relation";
export declare const ES_MVT_HITS_TOTAL_VALUE = "hits.total.value";
export declare function getAggsMeta(metaFeatures: TileMetaFeature[]): {
    docCount: number;
};
export declare function getHitsMeta(metaFeatures: TileMetaFeature[], maxResultWindow: number): {
    totalFeaturesCount: number;
    tilesWithFeatures: number;
    tilesWithTrimmedResults: number;
};
export declare function getAggRange(metaFeature: TileMetaFeature, subAggName: string): {
    min: number;
    max: number;
} | null;
export declare function hasIncompleteResults(tileMetaFeature: TileMetaFeature): boolean;
