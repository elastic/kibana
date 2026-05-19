import type { ScopedModel } from '@kbn/agent-builder-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
export interface GenerateEsqlCompletionResponse {
    /** Pipe fragment (one or more lines) to insert or replace. */
    content: string;
    /** When true, the editor should treat the line after the comment as replaced by `content`. */
    replacesNext: boolean;
}
export interface GenerateEsqlCompletionParams {
    model: ScopedModel;
    esClient: ElasticsearchClient;
    logger?: Logger;
    nlInstruction: string;
    currentQuery: string;
    signal?: AbortSignal;
}
/**
 * ES|QL completion used by the editor's comment-to-ES|QL action.
 *
 * Mirrors the pieces of {@link generateEsql} that matter for fragment generation:
 *  - keyword-targeted documentation (request_documentation step)
 *  - sampled field stats from the buffer's FROM target, when resolvable
 *  - `correctCommonEsqlMistakes` post-processing
 *  - structured output (no markdown-fence parsing)
 *
 * Skips the parts of {@link generateEsql} that don't apply to a fragment:
 *  - index discovery via indexExplorer (we already have the buffer's FROM)
 *  - validate/execute/retry loop (the output is a fragment, not a runnable query)
 */
export declare const generateEsqlCompletion: ({ model, esClient, logger, nlInstruction, currentQuery, signal, }: GenerateEsqlCompletionParams) => Promise<GenerateEsqlCompletionResponse>;
