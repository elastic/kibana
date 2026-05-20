import { type StreamQuery, type Streams } from '@kbn/streams-schema';
import type { Logger } from '@kbn/core/server';
import type { QueryClient } from '../../../lib/streams/assets/query/query_client';
export interface QueryInput {
    id?: string;
    title: string;
    description: string;
    esql: StreamQuery['esql'];
    severity_score?: number;
    evidence?: string[];
}
export declare function createQueryKnowledgeIndicatorToolHandler({ queryClient, definition, queryInput, logger, }: {
    queryClient: QueryClient;
    definition: Streams.all.Definition;
    queryInput: QueryInput;
    logger: Logger;
}): Promise<{
    id: string;
}>;
