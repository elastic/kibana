/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Agent } from '../../../../common/types/domain_data';
import {
  ReturnTypeGet,
  ReturnTypeList,
  ReturnTypeUpdate,
} from '../../../../common/types/std_return_format';
import { RestAPIAdapter } from '../rest_api/adapter_types';
import { AgentAdapter } from './memory_agent_adapter';

export class RestAgentAdapter extends AgentAdapter {
  constructor(private readonly REST: RestAPIAdapter) {
    super([]);
  }

  public async get(id: string): Promise<Agent | null> {
    try {
      return (await this.REST.get<ReturnTypeGet<Agent>>(`/api/fleet/agent/${id}`)).item;
    } catch (e) {
      return null;
    }
  }

  public async getWithToken(enrollmentToken: string): Promise<Agent | null> {
    try {
      return (await this.REST.get<ReturnTypeGet<Agent>>(
        `/api/fleet/agent/unknown/${enrollmentToken}`
      )).item;
    } catch (e) {
      return null;
    }
  }

  public async getAll(ESQuery?: string): Promise<Agent[]> {
    try {
      return (await this.REST.get<ReturnTypeList<Agent>>('/api/fleet/agents', { ESQuery })).list;
    } catch (e) {
      return [];
    }
  }

  public async getOnConfig(tagId: string): Promise<Agent[]> {
    try {
      return (await this.REST.get<ReturnTypeList<Agent>>(`/api/fleet/agents/tag/${tagId}`)).list;
    } catch (e) {
      return [];
    }
  }

  public async update(id: string, beatData: Partial<Agent>): Promise<boolean> {
    await this.REST.put<ReturnTypeUpdate<Agent>>(`/api/fleet/agent/${id}`, beatData);
    return true;
  }
}
