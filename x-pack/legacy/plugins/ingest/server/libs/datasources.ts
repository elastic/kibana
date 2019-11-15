/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FrameworkUser } from './adapters/framework/adapter_types';
import { Datasource } from './adapters/policy/adapter_types';

export class DatasourcesLib {
  public async getByIDs(_user: FrameworkUser, _ids: string[]): Promise<Datasource[]> {
    return new Promise(resolve => {
      resolve([]);
    });
  }
}
