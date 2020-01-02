/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { FrameworkUser } from '../../adapters/framework/adapter_types';

import {
  RuntimeAgentEventType,
  RuntimeAgentEventSubtype,
  AgentEvent,
} from '../../../common/types/domain_data';

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
      action_id: t.string,
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
    options?: {
      search?: string;
      page?: number;
      perPage?: number;
    }
  ): Promise<{ items: AgentEvent[]; total: number }>;
  list(
    user: FrameworkUser,
    options: {
      agentId?: string;
      search?: string;
      page?: number;
      perPage?: number;
    }
  ): Promise<{ items: AgentEvent[]; total: number }>;
  deleteEventsForAgent(user: FrameworkUser, agentId: string): Promise<void>;
}
