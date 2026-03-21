import type { ScopedModel, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { type IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { VisualizationConfig } from './chart_type_registry';
import { type Action, type GenerateEsqlAction, type GenerateConfigAction, type ValidateConfigAction, type GenerateTimeRangeAction } from './actions_lens';
export declare const createVisualizationGraph: (model: ScopedModel, logger: Logger, events: ToolEventEmitter, esClient: IScopedClusterClient) => import("@langchain/langgraph").CompiledStateGraph<{
    nlQuery: string;
    index: string | undefined;
    chartType: SupportedChartType;
    schema: object;
    existingConfig: string | undefined;
    parsedExistingConfig: VisualizationConfig | null;
    esqlQuery: string;
    currentAttempt: number;
    actions: Action[];
    validatedConfig: VisualizationConfig | null;
    timeRange: {
        from: string;
        to: string;
    } | null;
    error: string | null;
}, {
    nlQuery?: string | undefined;
    index?: string | undefined;
    chartType?: SupportedChartType | undefined;
    schema?: object | undefined;
    existingConfig?: string | undefined;
    parsedExistingConfig?: VisualizationConfig | null | undefined;
    esqlQuery?: string | undefined;
    currentAttempt?: number | undefined;
    actions?: Action[] | undefined;
    validatedConfig?: VisualizationConfig | null | undefined;
    timeRange?: {
        from: string;
        to: string;
    } | null | undefined;
    error?: string | null | undefined;
}, "finalize" | "__start__" | "generate_esql_query" | "generate_config" | "validate_config" | "generate_time_range", {
    nlQuery: import("@langchain/langgraph").LastValue<string>;
    index: import("@langchain/langgraph").LastValue<string | undefined>;
    chartType: import("@langchain/langgraph").LastValue<SupportedChartType>;
    schema: import("@langchain/langgraph").LastValue<object>;
    existingConfig: import("@langchain/langgraph").LastValue<string | undefined>;
    parsedExistingConfig: import("@langchain/langgraph").LastValue<VisualizationConfig | null>;
    esqlQuery: import("@langchain/langgraph").LastValue<string>;
    currentAttempt: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    actions: import("@langchain/langgraph").BinaryOperatorAggregate<Action[], Action[]>;
    validatedConfig: import("@langchain/langgraph").LastValue<VisualizationConfig | null>;
    timeRange: import("@langchain/langgraph").LastValue<{
        from: string;
        to: string;
    } | null>;
    error: import("@langchain/langgraph").LastValue<string | null>;
}, {
    nlQuery: import("@langchain/langgraph").LastValue<string>;
    index: import("@langchain/langgraph").LastValue<string | undefined>;
    chartType: import("@langchain/langgraph").LastValue<SupportedChartType>;
    schema: import("@langchain/langgraph").LastValue<object>;
    existingConfig: import("@langchain/langgraph").LastValue<string | undefined>;
    parsedExistingConfig: import("@langchain/langgraph").LastValue<VisualizationConfig | null>;
    esqlQuery: import("@langchain/langgraph").LastValue<string>;
    currentAttempt: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    actions: import("@langchain/langgraph").BinaryOperatorAggregate<Action[], Action[]>;
    validatedConfig: import("@langchain/langgraph").LastValue<VisualizationConfig | null>;
    timeRange: import("@langchain/langgraph").LastValue<{
        from: string;
        to: string;
    } | null>;
    error: import("@langchain/langgraph").LastValue<string | null>;
}, import("@langchain/langgraph").StateDefinition, {
    generate_esql_query: {
        actions: GenerateEsqlAction[];
    };
    generate_config: {
        currentAttempt: number;
        actions: GenerateConfigAction[];
    };
    validate_config: {
        actions: ValidateConfigAction[];
    };
    generate_time_range: {
        actions: GenerateTimeRangeAction[];
    };
    finalize: {
        validatedConfig: VisualizationConfig | null | undefined;
        error: string | null;
        esqlQuery: string | undefined;
        timeRange: {
            from: string;
            to: string;
        } | null;
    };
}>;
