import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { EbtTelemetryClient } from '../../lib/telemetry/ebt';
import type { GetScopedClients } from '../../routes/types';
export declare const registerAgentBuilderSkills: ({ agentBuilder, getScopedClients, telemetry, }: {
    agentBuilder: AgentBuilderPluginSetup;
    getScopedClients: GetScopedClients;
    telemetry: EbtTelemetryClient;
}) => void;
