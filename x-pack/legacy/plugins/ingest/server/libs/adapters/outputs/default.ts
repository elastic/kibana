/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkUser } from '../framework/adapter_types';
import { SODatabaseAdapter } from '../so_database/default';
import { Output } from '../../../../common/types/domain_data';

export class OutputAdapter {
  constructor(private readonly so: SODatabaseAdapter) {}

  public async get(user: FrameworkUser, id: string): Promise<Output | null> {
    const outputSO = await this.so.get<any>(user, 'outputs', id);
    if (!outputSO) {
      return null;
    }

    return {
      id: outputSO.id,
      ...outputSO.attributes,
    } as Output;
  }

  public async create(
    user: FrameworkUser,
    output: Partial<Output>,
    options?: { id?: string }
  ): Promise<Output> {
    const newSo = await this.so.create<any>(user, 'outputs', (output as any) as Output, options);

    return {
      id: newSo.id,
      ...newSo.attributes,
    };
  }

  public async delete(user: FrameworkUser, id: string): Promise<void> {
    await this.so.delete(user, 'outputs', id);
  }
}
