/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ReturnTypeList, ReturnTypeCreate } from '../../../../common/return_types';
import { Policy } from '../../../../scripts/mock_spec/types';

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
}
