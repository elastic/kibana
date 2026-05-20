import type { z } from '@kbn/zod/v4';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { StreamsServer } from '../../../types';
import type { GetScopedClients } from '../../../routes/types';
import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';
export declare const STREAMS_CREATE_QUERY_KNOWLEDGE_INDICATOR_TOOL_ID: "platform.streams.sig_events.ki_query_create";
declare const createQueryKnowledgeIndicatorSchema: z.ZodObject<{
    stream_name: z.ZodString;
    title: z.ZodString;
    esql: z.ZodType<import("@kbn/streams-schema").EsqlQuery, unknown, z.core.$ZodTypeInternals<import("@kbn/streams-schema").EsqlQuery, unknown>>;
    severity_score: z.ZodOptional<z.ZodNumber>;
    evidence: z.ZodOptional<z.ZodArray<z.ZodString>>;
    description: z.ZodDefault<z.ZodString>;
    id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare function createQueryKnowledgeIndicatorTool({ getScopedClients, server, logger, telemetry, }: {
    getScopedClients: GetScopedClients;
    server: StreamsServer;
    logger: Logger;
    telemetry: EbtTelemetryClient;
}): StaticToolRegistration<typeof createQueryKnowledgeIndicatorSchema>;
export {};
