/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  ReturnTypeList,
  ReturnTypeCreate,
  ReturnTypeUpdate,
  ReturnTypeAction,
} from '../../../../common/return_types';
import { Policy } from '../../../../common/types/domain_data';

export class PolicyAdapter {
  private memoryDB: Policy[];

  constructor(db: Policy[]) {
    this.memoryDB = db;
  }

  public async get(id: string) {
    return this.memoryDB.find(policy => policy.id === id) || null;
  }

  public async getAll(
    page: number,
    perPage: number,
    kuery?: string
  ): Promise<ReturnTypeList<Policy>> {
    const list = this.memoryDB;
    return { list, success: true, page, perPage, total: list.length };
  }

  public async create(policy: Partial<Policy>): Promise<ReturnTypeCreate<Policy>> {
    const item = {
      ...policy,
      id: `policy_${this.memoryDB.length}`,
      status: 'active',
    } as Policy;
    // @ts-ignore
    this.memoryDB.push(item);
    return { item, success: true, action: 'created' };
  }

  public async update(id: string, policy: Partial<Policy>): Promise<ReturnTypeUpdate<Policy>> {
    const index = this.memoryDB.findIndex(beat => beat.id === id);

    if (index === -1) {
      return { item: this.memoryDB[index], success: false, action: 'updated' };
    }

    this.memoryDB[index] = { ...this.memoryDB[index], ...policy };
    return { item: this.memoryDB[index], success: true, action: 'updated' };
  }

  public async getAgentStatus(policyId: string): Promise<ReturnTypeAction> {
    return {
      result: {
        total: 123,
        online: 123,
        error: 0,
        offline: 0,
      },
      success: true,
    };
  }
}
