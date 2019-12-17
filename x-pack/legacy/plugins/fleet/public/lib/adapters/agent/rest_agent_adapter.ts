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
  ReturnTypeBulkUnenroll,
} from '../../../../common/return_types';
import { RestAPIAdapter } from '../rest_api/adapter_types';
import { AgentAdapter } from './memory_agent_adapter';
import { AgentEvent } from '../../../../common/types/domain_data';

export class RestAgentAdapter extends AgentAdapter {
  constructor(private readonly REST: RestAPIAdapter) {
    super([]);
  }

  public async get(id: string): Promise<Agent | null> {
    try {
      return (await this.REST.get<ReturnTypeGet<Agent>>(`/api/fleet/agents/${id}`)).item;
    } catch (e) {
      return null;
    }
  }

  public async getAgentEvents(
    id: string,
    page: number,
    perPage: number,
    kuery?: string
  ): Promise<{
    total: number;
    list: AgentEvent[];
  }> {
    const { total, list } = await this.REST.get<ReturnTypeList<AgentEvent>>(
      `/api/fleet/agents/${id}/events`,
      {
        query: {
          page,
          perPage,
          kuery: kuery !== '' ? kuery : undefined,
        },
      }
    );

    return {
      total,
      list,
    };
  }

  public async getWithToken(enrollmentToken: string): Promise<Agent | null> {
    try {
      return (
        await this.REST.get<ReturnTypeGet<Agent>>(`/api/fleet/agent/unknown/${enrollmentToken}`)
      ).item;
    } catch (e) {
      return null;
    }
  }

  public async getAll(
    page: number,
    perPage: number,
    kuery?: string,
    showInactive: boolean = false
  ): Promise<ReturnTypeList<Agent>> {
    try {
      return await this.REST.get<ReturnTypeList<Agent>>('/api/fleet/agents', {
        query: {
          page,
          perPage,
          kuery: kuery !== '' ? kuery : undefined,
          showInactive,
        },
      });
    } catch (e) {
      return {
        list: [],
        success: false,
        page,
        total: 0,
        perPage,
      };
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
    await this.REST.put<ReturnTypeUpdate<Agent>>(`/api/fleet/agents/${id}`, { body: beatData });
    return true;
  }

  public async unenrollByIds(ids: string[]): Promise<ReturnTypeBulkUnenroll> {
    return await this.REST.post<ReturnTypeBulkUnenroll>(`/api/fleet/agents/unenroll`, {
      body: { ids },
    });
  }

  public async unenrollByKuery(kuery: string): Promise<ReturnTypeBulkUnenroll> {
    return await this.REST.post<ReturnTypeBulkUnenroll>(`/api/fleet/agents/unenroll`, {
      body: { kuery },
    });
  }
}
