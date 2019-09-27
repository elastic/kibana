/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { FrameworkUser } from '../../adapters/framework/adapter_types';

export const RuntimeAgentEventType = t.union([
  t.literal('STATE'),
  t.literal('ERROR'),
  t.literal('ACTION_RESULT'),
]);

export const RuntimeAgentEventSubtype = t.union([
  t.literal('RUNNING'),
  t.literal('STARTING'),
  t.literal('IN_PROGRESS'),
  t.literal('CONFIG'),
  t.literal('FAILED'),
  t.literal('STOPPED'),
  t.literal('DATA_DUMP'),
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
    }),
  ],
  'AgentEvent'
);
export type AgentEvent = t.TypeOf<typeof RuntimeAgentEvent>;

export const RuntimeAgentEventSOAttributes = t.intersection(
  [
    t.interface({
      type: RuntimeAgentEventType,
      subtype: RuntimeAgentEventSubtype,
      timestamp: t.string,
      message: t.string,
      agent_id: t.string,
    }),
    t.partial({
      payload: t.string,
      data: t.string,
    }),
  ],
  'AgentEventSOAttribute'
);
export type AgentEventSOAttributes = t.TypeOf<typeof RuntimeAgentEventSOAttributes>;

export interface AgentEventsRepository {
  createEventsForAgent(user: FrameworkUser, agentId: string, events: AgentEvent[]): Promise<void>;
  getEventsForAgent(
    user: FrameworkUser,
    agentId: string,
    page?: number,
    perPage?: number
  ): Promise<{ items: AgentEvent[]; total: number }>;
  deleteEventsForAgent(user: FrameworkUser, agentId: string): Promise<void>;
}
