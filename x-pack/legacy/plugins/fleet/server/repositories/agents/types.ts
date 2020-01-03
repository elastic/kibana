/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { FrameworkUser } from '../../adapters/framework/adapter_types';
import {
  RuntimeAgentType,
  RuntimeAgentAction,
  RuntimeAgent,
  NewAgent,
} from '../../../common/types/domain_data';

export const RuntimeSavedObjectAgentAttributes = t.intersection([
  t.partial({
    shared_id: t.string,
    access_api_key_id: t.string,
    last_updated: t.string,
    last_checkin: t.string,
    parent_id: t.string,
    version: t.string,
    enrolled_at: t.string,
    current_error_events: t.string,
  }),
  t.interface({
    type: RuntimeAgentType,
    active: t.boolean,
    id: t.string,
    user_provided_metadata: t.string,
    local_metadata: t.string,
    actions: t.array(RuntimeAgentAction),
  }),
]);

export type SavedObjectAgentAttributes = t.TypeOf<typeof RuntimeSavedObjectAgentAttributes>;
export type Agent = t.TypeOf<typeof RuntimeAgent>;

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

  bulkUpdate(
    user: FrameworkUser,
    data: Array<{ id: string; newData: Partial<Agent> }>
  ): Promise<void>;

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
