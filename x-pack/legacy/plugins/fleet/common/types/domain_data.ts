/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';

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
  active: boolean;
  type: 'PERMANENT' | 'TEMPORARY' | 'EPHEMERAL' | 'EPHEMERAL_INSTANCE';
  access_token?: string;
  enrolled_at?: string;
  user_provided_metadata?: { [key: string]: string };
  local_metadata?: { [key: string]: string };
  last_checkin?: string;
  actions: AgentAction[];
}

export interface AgentAction {
  id: string;
  type: string;
  created_at: string;
  data?: string;
  sent_at?: string;
}

export interface AgentEvent {
  timestamp: string;
  type: string;
  subtype: string;
  message: string;
  payload?: any;
  data?: string;
}
