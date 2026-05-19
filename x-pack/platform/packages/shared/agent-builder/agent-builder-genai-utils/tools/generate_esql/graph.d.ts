import type { TimeRange } from '@kbn/agent-builder-common';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { EsqlDocumentBase } from '@kbn/inference-plugin/server/tasks/nl_to_esql/doc_base';
import type { EsqlResponse } from '../utils/esql';
import type { ValidateEsqlQueryCallbacks } from '../utils/esql';
import type { ResolvedResourceWithSampling } from '../utils/resources';
import type { Action, ValidateQueryAction, AutocorrectQueryAction, GenerateQueryAction, RequestDocumentationAction } from './actions';
import type { EsqlLoadedDocumentation } from './documentation';
declare const StateAnnotation: import("@langchain/langgraph").AnnotationRoot<{
    nlQuery: import("@langchain/langgraph").LastValue<string>;
    target: import("@langchain/langgraph").LastValue<string>;
    executeQuery: import("@langchain/langgraph").LastValue<boolean>;
    maxRetries: import("@langchain/langgraph").LastValue<number>;
    additionalInstructions: import("@langchain/langgraph").LastValue<string | undefined>;
    additionalContext: import("@langchain/langgraph").LastValue<string | undefined>;
    rowLimit: import("@langchain/langgraph").LastValue<number | undefined>;
    disableNamedParams: import("@langchain/langgraph").LastValue<boolean | undefined>;
    timeRange: import("@langchain/langgraph").LastValue<TimeRange>;
    resource: import("@langchain/langgraph").LastValue<ResolvedResourceWithSampling>;
    currentTry: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
    actions: import("@langchain/langgraph").BaseChannel<Action[], Action[] | import("@langchain/langgraph").OverwriteValue<Action[]>, unknown>;
    answer: import("@langchain/langgraph").LastValue<string>;
    query: import("@langchain/langgraph").LastValue<string>;
    results: import("@langchain/langgraph").LastValue<EsqlResponse>;
    error: import("@langchain/langgraph").LastValue<string>;
}>;
export type StateType = typeof StateAnnotation.State;
export declare const createNlToEsqlGraph: ({ model, esClient, docBase, documentation, esqlCallbacks, }: {
    model: ScopedModel;
    esClient: ElasticsearchClient;
    docBase: EsqlDocumentBase;
    documentation: EsqlLoadedDocumentation;
    esqlCallbacks?: ValidateEsqlQueryCallbacks;
}) => import("@langchain/langgraph").CompiledStateGraph<{
    nlQuery: string;
    target: string;
    executeQuery: boolean;
    maxRetries: number;
    additionalInstructions: string | undefined;
    additionalContext: string | undefined;
    rowLimit: number | undefined;
    disableNamedParams: boolean | undefined;
    timeRange: TimeRange;
    resource: ResolvedResourceWithSampling;
    currentTry: number;
    actions: Action[];
    answer: string;
    query: string;
    results: EsqlResponse;
    error: string;
}, {
    nlQuery?: string | undefined;
    target?: string | undefined;
    executeQuery?: boolean | undefined;
    maxRetries?: number | undefined;
    additionalInstructions?: string | undefined;
    additionalContext?: string | undefined;
    rowLimit?: number | undefined;
    disableNamedParams?: boolean | undefined;
    timeRange?: TimeRange | undefined;
    resource?: ResolvedResourceWithSampling | undefined;
    currentTry?: number | import("@langchain/langgraph").OverwriteValue<number> | undefined;
    actions?: Action[] | import("@langchain/langgraph").OverwriteValue<Action[]> | undefined;
    answer?: string | undefined;
    query?: string | undefined;
    results?: EsqlResponse | undefined;
    error?: string | undefined;
}, "finalize" | "request_documentation" | "generate_esql" | "execute_query" | "autocorrect_query" | "validate_query" | "__start__" | "resolve_target", {
    nlQuery: import("@langchain/langgraph").LastValue<string>;
    target: import("@langchain/langgraph").LastValue<string>;
    executeQuery: import("@langchain/langgraph").LastValue<boolean>;
    maxRetries: import("@langchain/langgraph").LastValue<number>;
    additionalInstructions: import("@langchain/langgraph").LastValue<string | undefined>;
    additionalContext: import("@langchain/langgraph").LastValue<string | undefined>;
    rowLimit: import("@langchain/langgraph").LastValue<number | undefined>;
    disableNamedParams: import("@langchain/langgraph").LastValue<boolean | undefined>;
    timeRange: import("@langchain/langgraph").LastValue<TimeRange>;
    resource: import("@langchain/langgraph").LastValue<ResolvedResourceWithSampling>;
    currentTry: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
    actions: import("@langchain/langgraph").BaseChannel<Action[], Action[] | import("@langchain/langgraph").OverwriteValue<Action[]>, unknown>;
    answer: import("@langchain/langgraph").LastValue<string>;
    query: import("@langchain/langgraph").LastValue<string>;
    results: import("@langchain/langgraph").LastValue<EsqlResponse>;
    error: import("@langchain/langgraph").LastValue<string>;
}, {
    nlQuery: import("@langchain/langgraph").LastValue<string>;
    target: import("@langchain/langgraph").LastValue<string>;
    executeQuery: import("@langchain/langgraph").LastValue<boolean>;
    maxRetries: import("@langchain/langgraph").LastValue<number>;
    additionalInstructions: import("@langchain/langgraph").LastValue<string | undefined>;
    additionalContext: import("@langchain/langgraph").LastValue<string | undefined>;
    rowLimit: import("@langchain/langgraph").LastValue<number | undefined>;
    disableNamedParams: import("@langchain/langgraph").LastValue<boolean | undefined>;
    timeRange: import("@langchain/langgraph").LastValue<TimeRange>;
    resource: import("@langchain/langgraph").LastValue<ResolvedResourceWithSampling>;
    currentTry: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
    actions: import("@langchain/langgraph").BaseChannel<Action[], Action[] | import("@langchain/langgraph").OverwriteValue<Action[]>, unknown>;
    answer: import("@langchain/langgraph").LastValue<string>;
    query: import("@langchain/langgraph").LastValue<string>;
    results: import("@langchain/langgraph").LastValue<EsqlResponse>;
    error: import("@langchain/langgraph").LastValue<string>;
}, import("@langchain/langgraph").StateDefinition, {
    resolve_target: {
        resource: {
            fields: import("../..").MappingFieldWithStats[];
            name: string;
            type: import("@kbn/agent-builder-common").EsResourceType;
            description?: string;
            isTsdb: boolean;
        };
    };
    request_documentation: {
        actions: RequestDocumentationAction[];
    };
    generate_esql: {
        actions: GenerateQueryAction[];
        currentTry: number;
    };
    autocorrect_query: {
        actions: AutocorrectQueryAction[];
    };
    execute_query: import("@langchain/langgraph").UpdateType<{
        nlQuery: import("@langchain/langgraph").LastValue<string>;
        target: import("@langchain/langgraph").LastValue<string>;
        executeQuery: import("@langchain/langgraph").LastValue<boolean>;
        maxRetries: import("@langchain/langgraph").LastValue<number>;
        additionalInstructions: import("@langchain/langgraph").LastValue<string | undefined>;
        additionalContext: import("@langchain/langgraph").LastValue<string | undefined>;
        rowLimit: import("@langchain/langgraph").LastValue<number | undefined>;
        disableNamedParams: import("@langchain/langgraph").LastValue<boolean | undefined>;
        timeRange: import("@langchain/langgraph").LastValue<TimeRange>;
        resource: import("@langchain/langgraph").LastValue<ResolvedResourceWithSampling>;
        currentTry: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
        actions: import("@langchain/langgraph").BaseChannel<Action[], Action[] | import("@langchain/langgraph").OverwriteValue<Action[]>, unknown>;
        answer: import("@langchain/langgraph").LastValue<string>;
        query: import("@langchain/langgraph").LastValue<string>;
        results: import("@langchain/langgraph").LastValue<EsqlResponse>;
        error: import("@langchain/langgraph").LastValue<string>;
    }>;
    validate_query: {
        actions: ValidateQueryAction[];
    };
    finalize: {
        answer: string;
        query: string;
        results: EsqlResponse | undefined;
        error: string | undefined;
    } | {
        answer: string;
        query: string;
        error: string | undefined;
        results?: undefined;
    } | {
        answer: string;
        query: string;
        results?: undefined;
        error?: undefined;
    } | {
        error: string;
        answer: string;
        query: string | undefined;
        results?: undefined;
    } | {
        answer?: undefined;
        query?: undefined;
        results?: undefined;
        error?: undefined;
    };
}, unknown, unknown>;
export {};
