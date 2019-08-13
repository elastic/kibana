/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { DateFromString } from '../../../../common/types/io_ts';

const RuntimeAgentType = t.union([
  t.literal('PERMANENT'),
  t.literal('EPHEMERAL'),
  t.literal('EPHEMERAL_INSTANCE'),
]);

export type AgentType = t.TypeOf<typeof RuntimeAgentType>;

const newAgentProperties = {
  type: RuntimeAgentType,
  active: t.boolean,
  config_shared_id: t.string,
  config_id: t.string,
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
  }),
]);

export type SavedObjectAgentAttributes = t.TypeOf<typeof RuntimeSavedObjectAgentAttributes>;
export type Agent = t.TypeOf<typeof RuntimeAgent>;
export type NewAgent = t.TypeOf<typeof NewRuntimeAgent>;

export const RuntimeAgentEvent = t.interface(
  {
    type: t.union([t.literal('STATE'), t.literal('ERROR'), t.literal('ACTION_RESULT')]),
    beat: t.union([t.undefined, t.string]),
    timestamp: DateFromString,
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
      uuid: t.union([t.undefined, t.string]),
    }),
  },
  'AgentEvent'
);
export interface AgentEvent
  extends Pick<
    t.TypeOf<typeof RuntimeAgentEvent>,
    Exclude<keyof t.TypeOf<typeof RuntimeAgentEvent>, 'timestamp'>
  > {
  agent: string;
  timestamp: Date;
}

export enum SortOptions {
  EnrolledAtASC,
  EnrolledAtDESC,
}

export interface AgentAdapter {
  create(agent: NewAgent, options?: { id?: string; overwrite?: boolean }): Promise<Agent>;

  delete(agent: Agent): Promise<void>;

  getById(id: string): Promise<Agent | null>;

  getBySharedId(sharedId: string): Promise<Agent | null>;

  update(id: string, newData: Partial<Agent>): Promise<void>;

  findByMetadata(metadata: { local?: any; userProvided?: any }): Promise<Agent[]>;

  list(
    sortOptions?: SortOptions,
    page?: number,
    perPage?: number
  ): Promise<{ agents: Agent[]; total: number }>;

  findEphemeralByConfigSharedId(configSharedId: string): Promise<Agent | null>;

  getByEphemeralAccessToken(token: any): Promise<Agent | null>;
}
