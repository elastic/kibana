/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FrameworkUser } from './adapters/framework/adapter_types';
import { Datasource } from './adapters/policy/adapter_types';

export class DatasourcesLib {
  private datasources: Datasource[] = [];

  public async getByIDs(_user: FrameworkUser, ids: string[]): Promise<Datasource[]> {
    return new Promise(resolve => {
      resolve(this.datasources.filter(ds => ids.includes(ds.id)));
    });
  }

  public async add(_user: FrameworkUser, datasource: Datasource): Promise<Datasource> {
    return new Promise(resolve => {
      this.datasources.push(datasource);
      resolve(datasource);
    });
  }

  public async delete(_user: FrameworkUser, ids: string[]): Promise<boolean> {
    return new Promise(resolve => {
      this.datasources.filter(ds => !ids.includes(ds.id));
      resolve(true);
    });
  }
}
