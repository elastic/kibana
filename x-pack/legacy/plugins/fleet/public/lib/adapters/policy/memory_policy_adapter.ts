/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Policy } from '../../../../scripts/mock_spec/types';

export class PolicyAdapter {
  private memoryDB: Policy[];

  constructor(db: Policy[]) {
    this.memoryDB = db;
  }

  public async get(id: string) {
    return this.memoryDB.find(policy => policy.id === id) || null;
  }

  public async getAll(): Promise<Policy[]> {
    return this.memoryDB;
  }
}
