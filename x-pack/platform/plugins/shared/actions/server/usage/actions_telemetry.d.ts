import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { InMemoryConnector } from '../types';
export interface InMemoryAggRes {
    total: number;
    actionRefs: Record<string, {
        actionRef: string;
        actionTypeId: string;
    }>;
}
export interface ByActionTypeIdAgg {
    key: string;
    doc_count: number;
}
export interface ActionRefIdsAgg {
    key: string[];
    key_as_string: string;
    doc_count: number;
}
export interface ConnectorAggRes {
    total: number;
    connectorTypes: Record<string, number>;
}
export declare function getTotalCount(esClient: ElasticsearchClient, kibanaIndex: string, logger: Logger, inMemoryConnectors?: InMemoryConnector[]): Promise<{
    hasErrors: boolean;
    countTotal: number;
    countByType: Record<string, number>;
    countGenAiProviderTypes: Record<string, number>;
    errorMessage?: undefined;
} | {
    hasErrors: boolean;
    errorMessage: string;
    countTotal: number;
    countByType: {};
    countGenAiProviderTypes: {};
}>;
export declare function getInUseTotalCount(esClient: ElasticsearchClient, kibanaIndex: string, logger: Logger, referenceType?: string, inMemoryConnectors?: InMemoryConnector[]): Promise<{
    hasErrors: boolean;
    errorMessage?: string;
    countTotal: number;
    countByType: Record<string, number>;
    countByAlertHistoryConnectorType: number;
    countEmailByService: Record<string, number>;
    countNamespaces: number;
}>;
export declare const getCounts: (aggs: Record<string, number>) => {
    countByType: Record<string, number>;
    countGenAiProviderTypes: Record<string, number>;
};
export declare function replaceFirstAndLastDotSymbols(strToReplace: string): string;
export declare function getExecutionsPerDayCount(esClient: ElasticsearchClient, eventLogIndex: string, logger: Logger): Promise<{
    hasErrors: boolean;
    errorMessage?: string;
    countTotal: number;
    countByType: Record<string, number>;
    countFailed: number;
    countFailedByType: Record<string, number>;
    avgExecutionTime: number;
    avgExecutionTimeByType: Record<string, number>;
    countRunOutcomeByConnectorType: Record<string, Record<string, number>>;
}>;
