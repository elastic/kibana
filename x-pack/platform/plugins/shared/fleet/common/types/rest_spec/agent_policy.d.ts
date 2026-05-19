import { type TypeOf } from '@kbn/config-schema';
import type { AgentPolicy, NewAgentPolicy, FullAgentPolicy, OutputsForAgentPolicy } from '../models';
import type { ListResult, ListWithKuery, BulkGetResult } from './common';
export interface GetAgentPoliciesRequest {
    query: ListWithKuery & {
        noAgentCount?: boolean;
        withAgentCount?: boolean;
        full?: boolean;
    };
}
export type GetAgentPoliciesResponseItem = AgentPolicy;
export type BulkGetAgentPoliciesResponse = BulkGetResult<GetAgentPoliciesResponseItem>;
export type GetAgentPoliciesResponse = ListResult<GetAgentPoliciesResponseItem>;
export interface GetOneAgentPolicyRequest {
    params: {
        agentPolicyId: string;
    };
}
export interface GetOneAgentPolicyResponse {
    item: AgentPolicy;
}
export declare const GetAutoUpgradeAgentsStatusResponseSchema: import("@kbn/config-schema").ObjectType<{
    currentVersions: import("@kbn/config-schema").Type<Readonly<{
        failedUpgradeActionIds?: string[] | undefined;
        inProgressUpgradeActionIds?: string[] | undefined;
    } & {
        version: string;
        agents: number;
        failedUpgradeAgents: number;
        inProgressUpgradeAgents: number;
    }>[]>;
    totalAgents: import("@kbn/config-schema").Type<number>;
}>;
export type GetAutoUpgradeAgentsStatusResponse = TypeOf<typeof GetAutoUpgradeAgentsStatusResponseSchema>;
type Writeable<T> = {
    -readonly [P in keyof T]: T[P];
};
export type CurrentVersionCount = Writeable<GetAutoUpgradeAgentsStatusResponse['currentVersions'][number]>;
export interface CreateAgentPolicyRequest {
    body: NewAgentPolicy;
    query: {
        sys_monitoring?: boolean;
    };
}
export interface CreateAgentPolicyResponse {
    item: AgentPolicy;
}
export type UpdateAgentPolicyRequest = GetOneAgentPolicyRequest & {
    body: NewAgentPolicy & {
        bumpRevision?: boolean;
    };
};
export interface UpdateAgentPolicyResponse {
    item: AgentPolicy;
}
export interface CopyAgentPolicyRequest {
    body: Pick<AgentPolicy, 'name' | 'description'>;
}
export interface CopyAgentPolicyResponse {
    item: AgentPolicy;
}
export interface DeleteAgentPolicyRequest {
    body: {
        agentPolicyId: string;
    };
}
export interface DeleteAgentPolicyResponse {
    id: string;
    name: string;
}
export interface GetFullAgentPolicyRequest {
    params: {
        agentPolicyId: string;
    };
}
export interface GetFullAgentPolicyResponse {
    item: FullAgentPolicy;
}
export interface GetFullAgentConfigMapResponse {
    item: string;
}
export interface GetFullAgentManifestResponse {
    item: string;
}
export type FetchAllAgentPoliciesOptions = Pick<ListWithKuery, 'perPage' | 'kuery' | 'sortField' | 'sortOrder'> & {
    fields?: string[];
    spaceId?: string;
};
export type FetchAllAgentPolicyIdsOptions = Pick<ListWithKuery, 'perPage' | 'kuery'> & {
    spaceId?: string;
};
export interface GetAgentPolicyOutputsResponse {
    item: OutputsForAgentPolicy;
}
export interface GetListAgentPolicyOutputsResponse {
    items: OutputsForAgentPolicy[];
}
export interface GetListAgentPolicyOutputsRequest {
    body: {
        ids?: string[];
    };
}
export {};
