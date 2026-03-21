import type { AgentCapabilities, ResolvedAgentCapabilities } from '@kbn/agent-builder-common';
export declare const getDefaultCapabilities: () => ResolvedAgentCapabilities;
export declare const resolveCapabilities: (capabilities: AgentCapabilities | undefined) => ResolvedAgentCapabilities;
