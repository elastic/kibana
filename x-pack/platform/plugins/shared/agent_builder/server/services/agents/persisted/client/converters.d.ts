import type { GetResponse } from '@elastic/elasticsearch/lib/api/types';
import type { UserIdAndName } from '@kbn/agent-builder-common';
import type { AgentCreateRequest, AgentUpdateRequest } from '../../../../../common/agents';
import type { AgentProperties } from './storage';
import type { PersistedAgentDefinition } from '../types';
export type Document = Pick<GetResponse<AgentProperties>, '_id' | '_source'>;
export declare const fromEs: (document: Document) => PersistedAgentDefinition;
export declare const createRequestToEs: ({ profile, user, space, creationDate, }: {
    profile: AgentCreateRequest;
    user: UserIdAndName;
    space: string;
    creationDate: Date;
}) => AgentProperties;
export declare const updateRequestToEs: ({ agentId, currentProps, update, updateDate, }: {
    agentId: string;
    currentProps: AgentProperties;
    update: AgentUpdateRequest;
    updateDate: Date;
}) => AgentProperties;
