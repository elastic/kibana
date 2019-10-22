/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash';
import { Agent, AgentEvent } from '../../../../common/types/domain_data';
import { ReturnTypeBulkUnenroll } from '../../../../common/return_types';

export class AgentAdapter {
  private memoryDB: Agent[];

  constructor(db: Agent[]) {
    this.memoryDB = db;
  }

  public async get(id: string) {
    return this.memoryDB.find(beat => beat.id === id) || null;
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
    return { total: 0, list: [] };
  }

  public async update(id: string, beatData: Partial<Agent>): Promise<boolean> {
    const index = this.memoryDB.findIndex(beat => beat.id === id);

    if (index === -1) {
      return false;
    }

    this.memoryDB[index] = { ...this.memoryDB[index], ...beatData };
    return true;
  }

  public async getAll(page: number, perPage: number, kuery?: string, showInactive?: boolean) {
    const list = this.memoryDB.map<Agent>((beat: any) => omit(beat, ['access_token']));
    return { list, success: true, page, perPage, total: list.length };
  }
  public async getOnPolicy(tagId: string): Promise<Agent[]> {
    return this.memoryDB.map<Agent>((beat: any) => omit(beat, ['access_token']));
  }

  public async getWithToken(enrollmentToken: string): Promise<Agent | null> {
    return this.memoryDB.map<Agent>((beat: any) => omit(beat, ['access_token']))[0];
  }

  public async unenrollByIds(ids: string[]): Promise<ReturnTypeBulkUnenroll> {
    return {
      results: [],
      success: true,
    };
  }

  public async unenrollByKuery(ids: string): Promise<ReturnTypeBulkUnenroll> {
    return {
      results: [],
      success: true,
    };
  }
}
