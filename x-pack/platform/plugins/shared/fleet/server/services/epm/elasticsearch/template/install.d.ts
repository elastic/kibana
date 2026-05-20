import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ElasticsearchAssetType } from '../../../../types';
import type { RegistryDataStream, IndexTemplateEntry, RegistryElasticsearch, IndexTemplate, IndexTemplateMappings, TemplateMapEntry, TemplateMap, EsAssetReference, ExperimentalDataStreamFeature } from '../../../../types';
import type { AssetsMap, PackageInstallContext } from '../../../../../common/types';
export declare const prepareToInstallTemplates: (packageInstallContext: PackageInstallContext, esReferences: EsAssetReference[], experimentalDataStreamFeatures?: ExperimentalDataStreamFeature[], onlyForDataStreams?: RegistryDataStream[]) => Promise<{
    assetsToAdd: EsAssetReference[];
    assetsToRemove: EsAssetReference[];
    install: (esClient: ElasticsearchClient, logger: Logger) => Promise<IndexTemplateEntry[]>;
}>;
export declare function prepareDataStreamTemplates(dataStreams: RegistryDataStream[], packageInstallContext: PackageInstallContext, fieldAssetsMap: AssetsMap, experimentalDataStreamFeatures?: ExperimentalDataStreamFeature[]): Promise<{
    componentTemplates: TemplateMap;
    indexTemplate: IndexTemplateEntry;
}[]>;
/**
 * installComponentAndIndexTemplateForDataStream installs one template for each data stream
 *
 * The template is currently loaded with the pkgkey-package-data_stream
 */
export declare function installComponentAndIndexTemplateForDataStream({ esClient, logger, componentTemplates, indexTemplate, }: {
    esClient: ElasticsearchClient;
    logger: Logger;
    componentTemplates: TemplateMap;
    indexTemplate: IndexTemplateEntry;
}): Promise<void>;
export declare function buildComponentTemplates(params: {
    mappings: IndexTemplateMappings;
    templateName: string;
    registryElasticsearch: RegistryElasticsearch | undefined;
    packageName: string;
    pipelineName?: string;
    defaultSettings: IndexTemplate['template']['settings'];
    experimentalDataStreamFeature?: ExperimentalDataStreamFeature;
    lifecycle?: IndexTemplate['template']['lifecycle'];
    fieldCount?: number;
    type?: string;
    isOtelInputType?: boolean;
}): TemplateMap;
export declare function ensureDefaultComponentTemplates(esClient: ElasticsearchClient, logger: Logger): Promise<{
    isCreated: boolean;
}[]>;
export declare function ensureComponentTemplate(esClient: ElasticsearchClient, logger: Logger, name: string, body: TemplateMapEntry): Promise<{
    isCreated: boolean;
}>;
export declare function prepareTemplate({ packageInstallContext, fieldAssetsMap, dataStream, experimentalDataStreamFeature, ilmMigrationStatusMap, }: {
    packageInstallContext: PackageInstallContext;
    fieldAssetsMap: AssetsMap;
    dataStream: RegistryDataStream;
    experimentalDataStreamFeature?: ExperimentalDataStreamFeature;
    ilmMigrationStatusMap: Map<string, 'success' | undefined | null>;
}): {
    componentTemplates: TemplateMap;
    indexTemplate: IndexTemplateEntry;
};
export declare function getAllTemplateRefs(installedTemplates: IndexTemplateEntry[]): {
    id: string;
    type: ElasticsearchAssetType;
}[];
