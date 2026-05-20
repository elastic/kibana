import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EsAssetReference, RegistryDataStream } from '../../../../types';
import type { PackageInstallContext } from '../../../../../common/types';
export declare const prepareToInstallPipelines: (packageInstallContext: PackageInstallContext, onlyForDataStreams?: RegistryDataStream[]) => {
    assetsToAdd: EsAssetReference[];
    install: (esClient: ElasticsearchClient, logger: Logger) => Promise<void>;
};
export declare function installAllPipelines({ esClient, logger, paths, dataStream, packageInstallContext, }: {
    esClient: ElasticsearchClient;
    logger: Logger;
    paths: string[];
    dataStream?: RegistryDataStream;
    packageInstallContext: PackageInstallContext;
}): Promise<EsAssetReference[]>;
export declare function ensureFleetFinalPipelineIsInstalled(esClient: ElasticsearchClient, logger: Logger): Promise<{
    isCreated: boolean;
}>;
export declare function ensureFleetEventIngestedPipelineIsInstalled(esClient: ElasticsearchClient, logger: Logger): Promise<{
    isCreated: boolean;
}>;
