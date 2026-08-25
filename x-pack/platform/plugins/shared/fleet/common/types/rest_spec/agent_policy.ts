/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type TypeOf, schema } from '@kbn/config-schema';

import type {
  AgentPolicy,
  NewAgentPolicy,
  FullAgentPolicy,
  OutputsForAgentPolicy,
} from '../models';

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

export const GetAutoUpgradeAgentsStatusResponseSchema = schema.object({
  currentVersions: schema.arrayOf(
    schema.object({
      version: schema.string({
        meta: { description: 'Agent version' },
      }),
      agents: schema.number({
        meta: { description: 'Number of agents that upgraded to this version' },
      }),
      failedUpgradeAgents: schema.number({
        meta: { description: 'Number of agents that failed to upgrade to this version' },
      }),
      failedUpgradeActionIds: schema.maybe(
        schema.arrayOf(schema.string(), {
          meta: { description: 'List of action IDs related to failed upgrades' },
          maxSize: 1000,
        })
      ),
      inProgressUpgradeAgents: schema.number({
        meta: { description: 'Number of agents that are upgrading to this version' },
      }),
      inProgressUpgradeActionIds: schema.maybe(
        schema.arrayOf(schema.string(), {
          meta: { description: 'List of action IDs related to in-progress upgrades' },
          maxSize: 1000,
        })
      ),
    }),
    { maxSize: 10000 }
  ),
  totalAgents: schema.number(),
});

export type GetAutoUpgradeAgentsStatusResponse = TypeOf<
  typeof GetAutoUpgradeAgentsStatusResponseSchema
>;

type Writeable<T> = { -readonly [P in keyof T]: T[P] };
export type CurrentVersionCount = Writeable<
  GetAutoUpgradeAgentsStatusResponse['currentVersions'][number]
>;

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

export type FetchAllAgentPoliciesOptions = Pick<
  ListWithKuery,
  'perPage' | 'kuery' | 'sortField' | 'sortOrder'
> & { fields?: string[]; spaceId?: string };

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
