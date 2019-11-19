/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import {
  AGENT_TYPE_EPHEMERAL,
  AGENT_TYPE_PERMANENT,
  AGENT_TYPE_TEMPORARY,
} from '../../../common/constants';
import { FrameworkUser } from '../../adapters/framework/adapter_types';
import { RuntimeAgentEvent } from '../agent_events/types';

export const RuntimeAgentType = t.union([
  t.literal(AGENT_TYPE_PERMANENT),
  t.literal(AGENT_TYPE_EPHEMERAL),
  t.literal(AGENT_TYPE_TEMPORARY),
]);

const RuntimeAgentActionType = t.union([
  t.literal('DATA_DUMP'),
  t.literal('RESUME'),
  t.literal('PAUSE'),
  t.literal('UNENROLL'),
]);

export type AgentActionType = t.TypeOf<typeof RuntimeAgentActionType>;

export const RuntimeAgentActionData = t.interface(
  {
    type: RuntimeAgentActionType,
  },
  'AgentActionData'
);

export const RuntimeAgentAction = t.intersection([
  RuntimeAgentActionData,
  t.interface(
    {
      id: t.string,
      created_at: t.string,
    },
    'AgentAction'
  ),
  t.partial({
    data: t.string,
    sent_at: t.string,
  }),
]);

export type AgentType = t.TypeOf<typeof RuntimeAgentType>;

const newAgentProperties = {
  type: RuntimeAgentType,
  active: t.boolean,
};

const newAgentOptionalProperties = t.partial({
  parent_id: t.string,
  version: t.string,
  enrolled_at: t.string,
  user_provided_metadata: t.dictionary(t.string, t.string),
  local_metadata: t.dictionary(t.string, t.string),
  shared_id: t.string,
  access_api_key_id: t.string,
  access_api_key: t.string,
  policy_id: t.string,
});

export const NewRuntimeAgent = t.intersection([
  t.interface(newAgentProperties),
  newAgentOptionalProperties,
]);

export const RuntimeAgent = t.intersection([
  t.interface({
    ...newAgentProperties,
    id: t.string,
    actions: t.array(RuntimeAgentAction),
    error_events: t.array(RuntimeAgentEvent),
  }),
  t.partial({
    last_updated: t.string,
    last_checkin: t.string,
  }),
  newAgentOptionalProperties,
]);

export const RuntimeSavedObjectAgentAttributes = t.intersection([
  t.partial({
    shared_id: t.string,
    access_api_key_id: t.string,
    last_updated: t.string,
    last_checkin: t.string,
    parent_id: t.string,
    version: t.string,
    enrolled_at: t.string,
  }),
  t.interface({
    ...newAgentProperties,
    id: t.string,
    user_provided_metadata: t.string,
    local_metadata: t.string,
    actions: t.array(RuntimeAgentAction),
    error_events: t.array(RuntimeAgentEvent),
  }),
]);

export type SavedObjectAgentAttributes = t.TypeOf<typeof RuntimeSavedObjectAgentAttributes>;
export type Agent = t.TypeOf<typeof RuntimeAgent>;
export type NewAgent = t.TypeOf<typeof NewRuntimeAgent>;

export type AgentAction = t.TypeOf<typeof RuntimeAgentAction>;

export enum SortOptions {
  EnrolledAtASC,
  EnrolledAtDESC,
}

export interface ListOptions {
  showInactive?: boolean;
  sortOptions?: SortOptions;
  kuery?: string;
  page?: number;
  perPage?: number;
}

export interface AgentsRepository {
  create(
    user: FrameworkUser,
    agent: NewAgent,
    options?: { id?: string; overwrite?: boolean }
  ): Promise<Agent>;

  delete(user: FrameworkUser, agent: Agent): Promise<void>;

  getByAccessApiKeyId(user: FrameworkUser, apiKeyid: string): Promise<Agent | null>;

  getById(user: FrameworkUser, id: string): Promise<Agent | null>;

  getBySharedId(user: FrameworkUser, sharedId: string): Promise<Agent | null>;

  update(user: FrameworkUser, id: string, newData: Partial<Agent>): Promise<void>;

  findByMetadata(
    user: FrameworkUser,
    metadata: { local?: any; userProvided?: any }
  ): Promise<Agent[]>;

  list(
    user: FrameworkUser,
    options?: ListOptions
  ): Promise<{ agents: Agent[]; total: number; page: number; perPage: number }>;

  listForPolicy(
    user: FrameworkUser,
    policyId: string,
    options?: ListOptions
  ): Promise<{ agents: Agent[]; total: number; page: number; perPage: number }>;
}
