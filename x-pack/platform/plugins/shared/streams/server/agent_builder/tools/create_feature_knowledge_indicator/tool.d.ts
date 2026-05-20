import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import { baseFeatureSchema } from '@kbn/streams-schema';
import type { StreamsServer } from '../../../types';
import type { GetScopedClients } from '../../../routes/types';
import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';
export declare const STREAMS_CREATE_FEATURE_KNOWLEDGE_INDICATOR_TOOL_ID: "platform.streams.sig_events.ki_feature_create";
export declare function createFeatureKnowledgeIndicatorTool({ getScopedClients, server, logger, telemetry, }: {
    getScopedClients: GetScopedClients;
    server: StreamsServer;
    logger: Logger;
    telemetry: EbtTelemetryClient;
}): StaticToolRegistration<typeof baseFeatureSchema>;
