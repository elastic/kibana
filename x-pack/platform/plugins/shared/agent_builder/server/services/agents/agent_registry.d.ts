import type { MaybePromise } from '@kbn/utility-types';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AgentDefinition } from '@kbn/agent-builder-common/agents';
import type { AgentAvailabilityContext, AgentAvailabilityResult } from '@kbn/agent-builder-server/agents';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { AgentCreateRequest, AgentListOptions, AgentDeleteRequest, AgentUpdateRequest } from '../../../common/agents';
import type { WritableAgentProvider, ReadonlyAgentProvider } from './agent_source';
export type InternalAgentDefinition = AgentDefinition & {
    isAvailable: InternalAgentDefinitionAvailabilityHandler;
};
export type InternalAgentDefinitionAvailabilityHandler = (ctx: AgentAvailabilityContext) => MaybePromise<AgentAvailabilityResult>;
export interface AgentRegistry {
    has(agentId: string): Promise<boolean>;
    get(agentId: string): Promise<InternalAgentDefinition>;
    list(opts?: AgentListOptions): Promise<InternalAgentDefinition[]>;
    create(createRequest: AgentCreateRequest): Promise<InternalAgentDefinition>;
    update(agentId: string, update: AgentUpdateRequest): Promise<InternalAgentDefinition>;
    delete(args: AgentDeleteRequest): Promise<boolean>;
}
interface CreateAgentRegistryOpts {
    request: KibanaRequest;
    spaceId: string;
    persistedProvider: WritableAgentProvider;
    builtinProvider: ReadonlyAgentProvider;
    uiSettings: UiSettingsServiceStart;
    savedObjects: SavedObjectsServiceStart;
}
export declare const createAgentRegistry: (opts: CreateAgentRegistryOpts) => AgentRegistry;
export {};
