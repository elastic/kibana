import { z } from '@kbn/zod/v4';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { StreamsServer } from '../../../types';
import type { GetScopedClients } from '../../../routes/types';
export declare const STREAMS_SEARCH_KNOWLEDGE_INDICATORS_TOOL_ID: "platform.streams.sig_events.ki_search";
declare const searchKnowledgeIndicatorsSchema: z.ZodObject<{
    stream_names: z.ZodOptional<z.ZodArray<z.ZodString>>;
    search_text: z.ZodOptional<z.ZodString>;
    kind: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodEnum<{
        query: "query";
        feature: "feature";
    }>>>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare function createSearchKnowledgeIndicatorsTool({ getScopedClients, server, logger, }: {
    getScopedClients: GetScopedClients;
    server: StreamsServer;
    logger: Logger;
}): StaticToolRegistration<typeof searchKnowledgeIndicatorsSchema>;
export {};
