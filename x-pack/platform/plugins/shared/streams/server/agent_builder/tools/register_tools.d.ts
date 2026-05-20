import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { EbtTelemetryClient } from '../../lib/telemetry/ebt';
import type { GetScopedClients } from '../../routes/types';
import type { StreamsServer } from '../../types';
import { STREAMS_CREATE_FEATURE_KNOWLEDGE_INDICATOR_TOOL_ID } from './create_feature_knowledge_indicator/tool';
import { STREAMS_CREATE_QUERY_KNOWLEDGE_INDICATOR_TOOL_ID } from './create_query_knowledge_indicator/tool';
import { STREAMS_SEARCH_KNOWLEDGE_INDICATORS_TOOL_ID } from './search_knowledge_indicators/tool';
export { STREAMS_READ_TOOL_IDS, STREAMS_WRITE_TOOL_IDS, STREAMS_INSPECT_STREAMS_TOOL_ID, STREAMS_DIAGNOSE_STREAM_TOOL_ID, STREAMS_QUERY_DOCUMENTS_TOOL_ID, STREAMS_DESIGN_PIPELINE_TOOL_ID, STREAMS_LIST_ILM_POLICIES_TOOL_ID, STREAMS_UPDATE_STREAM_TOOL_ID, STREAMS_CREATE_PARTITION_TOOL_ID, STREAMS_DELETE_STREAM_TOOL_ID, } from './tool_ids';
export { STREAMS_CREATE_FEATURE_KNOWLEDGE_INDICATOR_TOOL_ID, STREAMS_CREATE_QUERY_KNOWLEDGE_INDICATOR_TOOL_ID, STREAMS_SEARCH_KNOWLEDGE_INDICATORS_TOOL_ID, };
export declare function registerAgentBuilderTools({ agentBuilder, getScopedClients, server, logger, telemetry, }: {
    agentBuilder: AgentBuilderPluginSetup;
    getScopedClients: GetScopedClients;
    server: StreamsServer;
    logger: Logger;
    telemetry: EbtTelemetryClient;
}): void;
