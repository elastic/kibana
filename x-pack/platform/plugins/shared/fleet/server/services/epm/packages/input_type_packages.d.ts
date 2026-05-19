import type { ElasticsearchClient, SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
import type { NewPackagePolicy, NewPackagePolicyInput, PackageInfo, PackagePolicy, RegistryDataStream } from '../../../types';
export declare const getDatasetName: (packagePolicyInput: NewPackagePolicyInput[]) => string;
export declare const findDataStreamsFromDifferentPackages: (datasetName: string, pkgInfo: PackageInfo, esClient: ElasticsearchClient, dataStreamType?: string) => Promise<{
    dataStream: RegistryDataStream;
    existingDataStreams: IndicesDataStream[];
}>;
export declare const checkExistingDataStreamsAreFromDifferentPackage: (pkgInfo: PackageInfo, existingDataStreams: IndicesDataStream[]) => boolean;
export declare const isInputPackageDatasetUsedByMultiplePolicies: (packagePolicies: PackagePolicy[], datasetName: string, pkgName: string) => boolean;
export declare function installAssetsForInputPackagePolicy(opts: {
    pkgInfo: PackageInfo;
    logger: Logger;
    packagePolicy: NewPackagePolicy;
    esClient: ElasticsearchClient;
    soClient: SavedObjectsClientContract;
    force: boolean;
}): Promise<void>;
export declare function removeAssetsForInputPackagePolicy(opts: {
    packageInfo: PackageInfo;
    datasetName: string;
    logger: Logger;
    esClient: ElasticsearchClient;
    savedObjectsClient: SavedObjectsClientContract;
}): Promise<void>;
/**
 * Applies time_series index mode rules to a data stream:
 * - Removes time_series index mode for non-metrics data streams
 * - Adds time_series index mode for OTel metrics data streams if not present
 * - Preserves existing time_series index mode for metrics data streams
 */
export declare const applyTimeSeriesIndexMode: ({ dataStream, inputType, dataStreamType, pkgName, logger, }: {
    dataStream: RegistryDataStream;
    inputType: string;
    dataStreamType: string;
    pkgName: string;
    logger: Logger;
}) => void;
