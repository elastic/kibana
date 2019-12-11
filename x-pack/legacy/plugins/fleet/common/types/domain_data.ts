/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
export { Policy, Datasource, Status, Output } from '../../../ingest/server/libs/types';
import { RuntimeAgent, RuntimeAgentAction } from '../../server/repositories/agents/types';
import { RuntimeAgentEvent } from '../../server/repositories/agent_events/types';
export { EnrollmentApiKey } from '../../server/repositories/enrollment_api_keys/types';

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
export type AgentEvent = t.TypeOf<typeof RuntimeAgentEvent>;

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
