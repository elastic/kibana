import type { KibanaRequest } from '@kbn/core-http-server';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { InferenceConnector } from '@kbn/inference-common';
import type { ActionsClientProvider } from '../../types';
export interface InferenceInvokeOptions {
    subAction: string;
    subActionParams?: Record<string, unknown>;
}
export type InferenceInvokeResult<Data = unknown> = ActionTypeExecutorResult<Data>;
/**
 * Represent the actual interface to communicate with the inference model.
 *
 * In practice, for now it's just a thin abstraction around the action client.
 */
export interface InferenceExecutor {
    getConnector: () => InferenceConnector;
    invoke<Data = unknown>(params: InferenceInvokeOptions): Promise<InferenceInvokeResult<Data>>;
}
export declare const createInferenceExecutor: ({ connector, actions, request, }: {
    connector: InferenceConnector;
    actions: ActionsClientProvider;
    request: KibanaRequest;
}) => InferenceExecutor;
export declare const getInferenceExecutor: ({ connectorId, actions, request, esClient, logger, }: {
    connectorId: string;
    actions: ActionsClientProvider;
    request: KibanaRequest;
    esClient: ElasticsearchClient;
    logger: Logger;
}) => Promise<InferenceExecutor>;
