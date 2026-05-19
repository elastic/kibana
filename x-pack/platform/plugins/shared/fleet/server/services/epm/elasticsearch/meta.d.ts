import type { ESAssetMetadata } from '../../../../common/types';
/**
 * Build common metadata object for Elasticsearch assets installed by Fleet. Result should be
 * stored on a `_meta` field on the generated assets.
 */
export declare function getESAssetMetadata({ packageName, }?: {
    packageName?: string;
}): ESAssetMetadata;
export declare function appendMetadataToIngestPipeline({ pipeline, packageName, }: {
    pipeline: any;
    packageName?: string;
}): any;
