import type { BuiltInAgentDefinition, AgentConfigContext } from '@kbn/agent-builder-server/agents';
import type { BuiltinAgentRegistry } from './registry';
import type { AgentProviderFn } from '../agent_source';
import type { InternalAgentDefinition } from '../agent_registry';
import { AgentAvailabilityCache } from './availability_cache';
export declare const createBuiltinProviderFn: ({ registry, }: {
    registry: BuiltinAgentRegistry;
}) => AgentProviderFn<true>;
export declare const toInternalDefinition: ({ definition, availabilityCache, configContext, }: {
    definition: BuiltInAgentDefinition;
    availabilityCache: AgentAvailabilityCache;
    configContext: AgentConfigContext;
}) => Promise<InternalAgentDefinition>;
