import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { InferenceInferenceEndpointInfo, MlTrainedModelStats } from '@elastic/elasticsearch/lib/api/types';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import type { CoreSetup } from '@kbn/core/server';
import type { DocumentationManagerAPI } from '@kbn/product-doc-base-plugin/server/services/doc_manager';
import type { InstallationStatus } from '@kbn/product-doc-base-plugin/common/install_status';
import { InferenceModelState } from '../../common';
import type { ObservabilityAIAssistantConfig } from '../config';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../types';
export declare const getInferenceEndpointsForEmbedding: ({ esClient, logger, }: {
    esClient: {
        asInternalUser: ElasticsearchClient;
    };
    logger: Logger;
}) => Promise<{
    inferenceEndpoints: InferenceAPIConfigResponse[];
}>;
export declare function deleteInferenceEndpoint({ esClient, logger, inferenceId, }: {
    esClient: {
        asInternalUser: ElasticsearchClient;
    };
    logger: Logger;
    inferenceId: string;
}): Promise<void>;
export declare function isInferenceEndpointMissingOrUnavailable(error: Error): boolean;
export declare function getKbModelStatus({ core, esClient, logger, config, inferenceId, productDoc, }: {
    core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
    esClient: {
        asInternalUser: ElasticsearchClient;
    };
    logger: Logger;
    config: ObservabilityAIAssistantConfig;
    inferenceId?: string;
    productDoc: DocumentationManagerAPI;
}): Promise<{
    enabled: boolean;
    endpoint?: InferenceInferenceEndpointInfo;
    modelStats?: MlTrainedModelStats;
    errorMessage?: string;
    inferenceModelState: InferenceModelState;
    currentInferenceId?: string | undefined;
    concreteWriteIndex: string | undefined;
    isReIndexing: boolean;
    productDocStatus: InstallationStatus;
}>;
export declare function waitForKbModel({ core, esClient, logger, config, inferenceId, productDoc, }: {
    core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
    esClient: {
        asInternalUser: ElasticsearchClient;
    };
    logger: Logger;
    config: ObservabilityAIAssistantConfig;
    inferenceId: string;
    productDoc: DocumentationManagerAPI;
}): Promise<void>;
export declare function warmupModel({ esClient, logger, inferenceId, }: {
    esClient: {
        asInternalUser: ElasticsearchClient;
    };
    logger: Logger;
    inferenceId: string;
}): Promise<void>;
