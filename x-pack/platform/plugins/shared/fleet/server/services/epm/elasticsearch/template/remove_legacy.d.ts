import type { ClusterComponentTemplate, IndicesGetIndexTemplateIndexTemplateItem } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { InstallablePackage } from '../../../../types';
export declare const _getLegacyComponentTemplatesForPackage: (componentTemplates: ClusterComponentTemplate[], installablePackage: InstallablePackage) => string[];
export declare const _getIndexTemplatesToUsedByMap: (indexTemplates: IndicesGetIndexTemplateIndexTemplateItem[]) => Map<string, string[]>;
export declare const _filterComponentTemplatesInUse: ({ componentTemplateNames, indexTemplates, logger, }: {
    componentTemplateNames: string[];
    indexTemplates: IndicesGetIndexTemplateIndexTemplateItem[];
    logger: Logger;
}) => string[];
export declare const removeLegacyTemplates: (params: {
    packageInfo: InstallablePackage;
    esClient: ElasticsearchClient;
    logger: Logger;
}) => Promise<void>;
