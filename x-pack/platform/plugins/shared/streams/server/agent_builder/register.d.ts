import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { StreamsServer } from '../types';
import type { GetScopedClients } from '../routes/types';
import type { EbtTelemetryClient } from '../lib/telemetry/ebt';
export declare const registerStreamsAgentBuilder: ({ agentBuilder, getScopedClients, server, logger, telemetry, isMemoryEnabled, }: {
    agentBuilder: AgentBuilderPluginSetup;
    getScopedClients: GetScopedClients;
    server: StreamsServer;
    logger: Logger;
    telemetry: EbtTelemetryClient;
    isMemoryEnabled: () => Promise<boolean>;
}) => Promise<{
    ensureMemorySkillRegistered: () => void;
    /**
     * Call this from a uiSettings change subscription (e.g. in plugin start)
     * to auto-register the memory skill when the setting is toggled on.
     */
    onMemorySettingChanged: () => Promise<void>;
}>;
