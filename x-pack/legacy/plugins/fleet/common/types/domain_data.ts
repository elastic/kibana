/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { AGENT_TYPE_EPHEMERAL, AGENT_TYPE_PERMANENT, AGENT_TYPE_TEMPORARY } from '../constants';
export { Policy, Datasource, Status, Output } from '../../../ingest/server/libs/types';

const RuntimeAgentActionType = t.union([
  t.literal('POLICY_CHANGE'),
  t.literal('DATA_DUMP'),
  t.literal('RESUME'),
  t.literal('PAUSE'),
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

export const RuntimeAgentType = t.union([
  t.literal(AGENT_TYPE_PERMANENT),
  t.literal(AGENT_TYPE_EPHEMERAL),
  t.literal(AGENT_TYPE_TEMPORARY),
]);

export type AgentType = t.TypeOf<typeof RuntimeAgentType>;

export const RuntimeAgentEventType = t.union([
  t.literal('STATE'),
  t.literal('ERROR'),
  t.literal('ACTION_RESULT'),
  t.literal('ACTION'),
]);

export const RuntimeAgentEventSubtype = t.union([
  // State
  t.literal('RUNNING'),
  t.literal('STARTING'),
  t.literal('IN_PROGRESS'),
  t.literal('CONFIG'),
  t.literal('FAILED'),
  t.literal('STOPPED'),
  // Action results
  t.literal('DATA_DUMP'),
  // Actions
  t.literal('ACKNOWLEDGED'),
  t.literal('UNKNOWN'),
]);

export const RuntimeAgentEvent = t.intersection(
  [
    t.interface({
      type: RuntimeAgentEventType,
      subtype: RuntimeAgentEventSubtype,
      timestamp: t.string,
      message: t.string,
    }),
    t.partial({
      payload: t.any,
      data: t.string,
      action_id: t.string,
      policy_id: t.string,
      stream_id: t.string,
    }),
  ],
  'AgentEvent'
);

export type AgentEvent = t.TypeOf<typeof RuntimeAgentEvent>;

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

export const RuntimeAgent = t.intersection([
  t.interface({
    ...newAgentProperties,
    id: t.string,
    actions: t.array(RuntimeAgentAction),
    current_error_events: t.array(RuntimeAgentEvent),
  }),
  t.partial({
    last_updated: t.string,
    last_checkin: t.string,
  }),
  newAgentOptionalProperties,
]);

export const NewRuntimeAgent = t.intersection([
  t.interface(newAgentProperties),
  newAgentOptionalProperties,
]);
export type NewAgent = t.TypeOf<typeof NewRuntimeAgent>;

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

export type AgentStatus = 'offline' | 'error' | 'online' | 'inactive' | 'warning';

export type Agent = t.TypeOf<typeof RuntimeAgent> & {
  status: AgentStatus;
};
export type AgentAction = t.TypeOf<typeof RuntimeAgentAction>;

export type PolicyUpdatedEvent =
  | {
      type: 'created';
      policyId: string;
      payload: any;
    }
  | {
      type: 'updated';
      policyId: string;
      payload: any;
    }
  | {
      type: 'deleted';
      policyId: string;
    };

export const RuntimeEnrollmentRuleData = t.partial(
  {
    ip_ranges: t.array(t.string),
    window_duration: t.interface(
      {
        from: t.string,
        to: t.string,
      },
      'WindowDuration'
    ),
    types: t.array(RuntimeAgentType),
  },
  'EnrollmentRuleData'
);

export type EnrollmentRuleData = t.TypeOf<typeof RuntimeEnrollmentRuleData>;

export type EnrollmentRule = EnrollmentRuleData & {
  id: string;
  created_at: string;
  updated_at?: string;
};
export interface EnrollmentApiKey {
  id: string;
  api_key_id: string;
  api_key: string;
  name?: string;
  created_at: string;
  expire_at?: string;
  active: boolean;
  enrollment_rules: EnrollmentRule[];
  policy_id?: string;
  [k: string]: any; // allow to use it as saved object attributes type
}
