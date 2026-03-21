import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { VisualizationConfig } from './types';
interface BuildVisualizationConfigParams {
    nlQuery: string;
    index?: string;
    chartType?: SupportedChartType;
    esql?: string;
    existingConfig?: string;
    parsedExistingConfig?: VisualizationConfig | null;
    modelProvider: ModelProvider;
    logger: Logger;
    events: ToolEventEmitter;
    esClient: IScopedClusterClient;
}
interface BuildVisualizationConfigResult {
    selectedChartType: SupportedChartType;
    validatedConfig: VisualizationConfig;
    esqlQuery: string;
    timeRange?: {
        from: string;
        to: string;
    };
}
export declare const buildVisualizationConfig: ({ nlQuery, index, chartType, esql, existingConfig, parsedExistingConfig, modelProvider, logger, events, esClient, }: BuildVisualizationConfigParams) => Promise<BuildVisualizationConfigResult>;
export {};
