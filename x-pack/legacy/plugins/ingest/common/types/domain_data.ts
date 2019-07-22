/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { DateFromString } from './io_ts';

// Here we create the runtime check for a generic, unknown beat config type.
// We can also pass in optional params to create spacific runtime checks that
// can be used to validate blocs on the API and UI
export const createConfigurationInterface = (beatConfigInterface: t.Mixed = t.Dictionary) =>
  t.interface(
    {
      id: t.union([t.undefined, t.string]),
      name: t.string,
      description: t.union([t.undefined, t.string]),
      config: beatConfigInterface,
      last_updated_by: t.union([t.undefined, t.string]),
      last_updated: t.union([t.undefined, t.number]),
    },
    'Config'
  );
const BaseConfiguration = createConfigurationInterface();
export interface ConfigurationBlock
  extends Pick<
    t.TypeOf<typeof BaseConfiguration>,
    Exclude<keyof t.TypeOf<typeof BaseConfiguration>, 'id'>
  > {
  id: string;
}

export interface Agent {
  id: string;
  status?: AgentEvent;
  enrollment_token: string;
  active: boolean;
  access_token: string;
  verified_on?: string;
  type: string;
  version?: string;
  host_ip: string;
  host_name: string;
  ephemeral_id?: string;
  last_checkin?: Date;
  event_rate?: string;
  tags: string[];
  metadata?: {};
  name?: string;
  last_updated: number;
}

export const RuntimeAgentEvent = t.interface(
  {
    type: t.union([t.literal('STATE'), t.literal('ERROR')]),
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
