/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { FrameworkUser } from '../framework/adapter_types';

const RuntimeAgentType = t.union([
  t.literal('PERMANENT'),
  t.literal('EPHEMERAL'),
  t.literal('EPHEMERAL_INSTANCE'),
  t.literal('TEMPORARY'),
]);

export const RuntimeAgentEvent = t.interface(
  {
    type: t.union([t.literal('STATE'), t.literal('ERROR'), t.literal('ACTION_RESULT')]),
    timestamp: t.string,
    event: t.type({
      type: t.union([
        t.literal('RUNNING'),
        t.literal('STARTING'),
        t.literal('IN_PROGRESS'),
        t.literal('CONFIG'),
        t.literal('FAILED'),
        t.literal('STOPPED'),
        t.literal('DATA_DUMP'),
      ]),
      message: t.string,
    }),
  },
  'AgentEvent'
);

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
  policy_shared_id: t.string,
  policy_id: t.string,
};

const newAgentOptionalProperties = t.partial({
  parent_id: t.string,
  version: t.string,
  enrolled_at: t.string,
  user_provided_metadata: t.dictionary(t.string, t.string),
  local_metadata: t.dictionary(t.string, t.string),
  shared_id: t.string,
  access_token: t.string,
});

export const NewRuntimeAgent = t.intersection([
  t.interface(newAgentProperties),
  newAgentOptionalProperties,
]);

export const RuntimeAgent = t.intersection([
  t.interface({
    ...newAgentProperties,
    id: t.string,
    events: t.array(RuntimeAgentEvent),
    actions: t.array(RuntimeAgentAction),
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
    access_token: t.string,
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
    events: t.array(RuntimeAgentEvent),
    actions: t.array(RuntimeAgentAction),
  }),
]);

export type SavedObjectAgentAttributes = t.TypeOf<typeof RuntimeSavedObjectAgentAttributes>;
export type Agent = t.TypeOf<typeof RuntimeAgent>;
export type NewAgent = t.TypeOf<typeof NewRuntimeAgent>;

export type AgentAction = t.TypeOf<typeof RuntimeAgentAction>;
export type AgentEvent = t.TypeOf<typeof RuntimeAgentEvent>;

export enum SortOptions {
  EnrolledAtASC,
  EnrolledAtDESC,
}

export interface AgentAdapter {
  create(
    user: FrameworkUser,
    agent: NewAgent,
    options?: { id?: string; overwrite?: boolean }
  ): Promise<Agent>;

  delete(user: FrameworkUser, agent: Agent): Promise<void>;

  getById(user: FrameworkUser, id: string): Promise<Agent | null>;

  getBySharedId(user: FrameworkUser, sharedId: string): Promise<Agent | null>;

  update(user: FrameworkUser, id: string, newData: Partial<Agent>): Promise<void>;

  findByMetadata(
    user: FrameworkUser,
    metadata: { local?: any; userProvided?: any }
  ): Promise<Agent[]>;

  list(
    user: FrameworkUser,
    sortOptions?: SortOptions,
    page?: number,
    perPage?: number
  ): Promise<{ agents: Agent[]; total: number }>;

  findEphemeralByPolicySharedId(user: FrameworkUser, policySharedId: string): Promise<Agent | null>;

  getByEphemeralAccessToken(user: FrameworkUser, token: any): Promise<Agent | null>;
}
