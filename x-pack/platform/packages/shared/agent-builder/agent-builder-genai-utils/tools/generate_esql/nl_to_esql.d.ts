import type { TimeRange } from '@kbn/agent-builder-common';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import type { EsqlResponse } from '../utils/esql';
export interface GenerateEsqlResponse {
    /**
     * The ES|QL query which was generated
     */
    query: string;
    /**
     * The full text answer which was provided by the LLM when generating the query.
     */
    answer: string;
    /**
     * Results from executing the query.
     * Available if `executeQuery` was true and if a successful query was executed.
     */
    results?: EsqlResponse;
    /**
     * Error message if the query could not be executed
     */
    error?: string;
}
export interface GenerateEsqlDeps {
    model: ScopedModel;
    esClient: ElasticsearchClient;
    logger: Logger;
    events?: ToolEventEmitter;
}
export interface GenerateEsqlOptions {
    /**
     * The natural language query to generate ES|QL from
     */
    nlQuery: string;
    /**
     * The resource (index/datastream/alias) to target
     */
    index?: string;
    /**
     * Additional context to provide to the model (user prompt)
     */
    additionalContext?: string;
    /**
     * Additional instructions to provide to the model (system prompt)
     */
    additionalInstructions?: string;
    /**
     * If true, will attempt to execute the query and will return the results.
     * Defaults to `true`
     */
    executeQuery?: boolean;
    /**
     * Maximum number of retries if the query fails (execute or AST validation).
     * When `executeQuery` is true: retries after execution errors; when false: retries after AST validation errors.
     * Defaults to `3`
     * */
    maxRetries?: number;
    /**
     * Maximum row limit to use in generated ES|QL queries.
     */
    rowLimit?: number;
    /**
     * Time range used to supply named parameters (?_tstart, ?_tend)
     * when executing the generated query for validation.
     * Defaults to last 24 hours if not provided.
     */
    timeRange?: TimeRange;
    /**
     * If true, omits the instruction to use named parameters (?_tstart, ?_tend)
     * for time range filtering in generated queries.
     */
    disableNamedParams?: boolean;
}
export type GenerateEsqlParams = GenerateEsqlOptions & GenerateEsqlDeps;
export declare const generateEsql: ({ nlQuery, index, executeQuery, additionalInstructions, additionalContext, maxRetries, rowLimit, timeRange: inputTimeRange, disableNamedParams, model, esClient, logger, }: GenerateEsqlParams) => Promise<GenerateEsqlResponse>;
