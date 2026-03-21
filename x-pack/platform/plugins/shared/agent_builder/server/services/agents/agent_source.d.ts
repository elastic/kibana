import type { MaybePromise } from '@kbn/utility-types';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AgentCreateRequest, AgentListOptions, AgentUpdateRequest } from '../../../common/agents';
import type { InternalAgentDefinition } from './agent_registry';
export interface ReadonlyAgentProvider {
    id: string;
    readonly: true;
    has(agentId: string): MaybePromise<boolean>;
    get(agentId: string): MaybePromise<InternalAgentDefinition>;
    list(opts: AgentListOptions): MaybePromise<InternalAgentDefinition[]>;
}
export interface WritableAgentProvider extends Omit<ReadonlyAgentProvider, 'readonly'> {
    readonly: false;
    create(createRequest: AgentCreateRequest): MaybePromise<InternalAgentDefinition>;
    update(agentId: string, update: AgentUpdateRequest): MaybePromise<InternalAgentDefinition>;
    delete(agentId: string): MaybePromise<boolean>;
}
export type AgentProvider = ReadonlyAgentProvider | WritableAgentProvider;
export type AgentProviderFn<ReadOnly extends boolean> = (opts: {
    space: string;
    request: KibanaRequest;
}) => MaybePromise<ReadOnly extends true ? ReadonlyAgentProvider : WritableAgentProvider>;
export declare const isWritableProvider: (provider: AgentProvider) => provider is WritableAgentProvider;
export declare const isReadonlyProvider: (provider: AgentProvider) => provider is ReadonlyAgentProvider;
