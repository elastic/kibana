import type { ElasticsearchCapabilities } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { DatasetQualityServerRouteRepository } from '.';
import type { DatasetQualityPluginSetupDependencies, DatasetQualityPluginStartDependencies, DatasetQualityRequestHandlerContext } from '../types';
export type { DatasetQualityServerRouteRepository };
export interface DatasetQualityRouteHandlerResources {
    context: DatasetQualityRequestHandlerContext;
    logger: Logger;
    request: KibanaRequest;
    plugins: {
        [key in keyof DatasetQualityPluginSetupDependencies]: {
            setup: Required<DatasetQualityPluginSetupDependencies>[key];
            start: () => Promise<Required<DatasetQualityPluginStartDependencies>[key]>;
        };
    };
    getEsCapabilities: () => Promise<ElasticsearchCapabilities>;
}
export interface DatasetQualityRouteCreateOptions {
    tags: string[];
}
