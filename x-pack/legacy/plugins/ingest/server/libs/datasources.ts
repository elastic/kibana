/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReturnTypeBulkDelete } from '../../common/types/std_return_format';
import { FrameworkUser } from './adapters/framework/adapter_types';
import { StoredDatasource } from './adapters/datasource/adapter_types';
import { DatasourceAdapter } from './adapters/datasource/default';
import { BackendFrameworkLib } from './framework';
import { Datasource } from '../../common/types/domain_data';

export class DatasourcesLib {
  constructor(
    private readonly adapter: DatasourceAdapter,
    private readonly libs: {
      framework: BackendFrameworkLib;
    }
  ) {}

  public async create(withUser: FrameworkUser, datasource: StoredDatasource) {
    const info = this.libs.framework.info;
    if (info === null) {
      throw new Error('Could not get version information about Kibana from xpack');
    }

    return await this.adapter.create(
      withUser,
      datasource,
      datasource.id ? { id: datasource.id } : {}
    );
  }

  public async get(user: FrameworkUser, id: string): Promise<Datasource | null> {
    const datasource = await this.adapter.get(user, id);
    if (!datasource) {
      return null;
    }
    return {
      id,
      ...datasource,
    } as Datasource;
  }

  public async getByIDs(user: FrameworkUser, ids: string[]): Promise<Datasource[]> {
    return (await this.adapter.getByIDs(user, ids)) as Datasource[];
  }

  public async list(
    user: FrameworkUser,
    options: {
      kuery?: string;
      page?: number;
      perPage?: number;
    } = {
      page: 1,
      perPage: 20,
    }
  ): Promise<{ items: Datasource[]; total: number; page: number; perPage: number }> {
    const response = await this.adapter.list(user, options);

    return {
      ...response,
      items: response.items as Datasource[],
    };
  }

  public async update(
    user: FrameworkUser,
    id: string,
    datasource: Partial<Datasource>
  ): Promise<Datasource> {
    const oldDatasource = await this.adapter.get(user, id);

    if (!oldDatasource) {
      throw new Error('Datasource not found');
    }

    return await this._update(user, id, { ...oldDatasource, ...(datasource as StoredDatasource) });
  }

  public async delete(user: FrameworkUser, ids: string[]): Promise<ReturnTypeBulkDelete> {
    for (const id of ids) {
      await this.adapter.delete(user, id);
    }

    return {
      results: ids.map(() => ({
        success: true,
        action: 'deleted',
      })),
      success: true,
    };
  }

  private async _update(user: FrameworkUser, id: string = 'new', datasource: StoredDatasource) {
    await this.adapter.update(user, id, {
      ...datasource,
    });

    return datasource as Datasource;
  }
}
