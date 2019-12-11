/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isRight, Right } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { ListOptions } from '../../../../../fleet/server/repositories/agents/types';
import { FrameworkUser } from '../framework/adapter_types';
import { SODatabaseAdapter } from '../so_database/default';
import { RuntimeStoredDatasource, StoredDatasource } from './adapter_types';

export class DatasourceAdapter {
  constructor(private readonly so: SODatabaseAdapter) {}

  public async create(
    user: FrameworkUser,
    datasource: StoredDatasource,
    options?: { id?: string }
  ): Promise<StoredDatasource> {
    const newSo = await this.so.create<any>(
      user,
      'datasources',
      (datasource as any) as StoredDatasource,
      options
    );

    return {
      id: newSo.id,
      ...newSo.attributes,
    };
  }

  public async get(user: FrameworkUser, id: string): Promise<StoredDatasource | null> {
    const datasourceSO = await this.so.get<any>(user, 'datasources', id);
    if (!datasourceSO) {
      return null;
    }

    if (datasourceSO.error) {
      throw new Error(datasourceSO.error.message);
    }

    const datasource = {
      id: datasourceSO.id,
      ...datasourceSO.attributes,
    };

    const decoded = RuntimeStoredDatasource.decode(datasource);

    if (isRight(decoded)) {
      return decoded.right;
    } else {
      throw new Error(
        `Invalid datasource data. == ${JSON.stringify(datasource)} -- ${PathReporter.report(
          decoded
        )}`
      );
    }
  }

  public async getByIDs(user: FrameworkUser, ids: string[]): Promise<StoredDatasource[] | null> {
    const datasourceSO = await this.so.bulkGet<any>(
      user,
      ids.map(id => ({
        id,
        type: 'datasources',
      }))
    );
    if (!datasourceSO) {
      return null;
    }

    const datasources = datasourceSO.saved_objects.map(so => ({
      id: so.id,
      ...so.attributes,
    }));

    const decoded = datasources
      .map(ds => RuntimeStoredDatasource.decode(ds))
      .filter(d => isRight(d)) as Array<Right<StoredDatasource>>;

    return decoded.map(d => d.right);
  }

  public async list(
    user: FrameworkUser,
    options: ListOptions = {}
  ): Promise<{ items: StoredDatasource[]; total: number; page: number; perPage: number }> {
    const { page = 1, perPage = 20, kuery } = options;

    const datasources = await this.so.find<any>(user, {
      type: 'datasources',
      page,
      perPage,
      // To ensure users dont need to know about SO data structure...
      filter: kuery ? kuery.replace(/datasources\./g, 'datasources.attributes.') : undefined,
    });

    const storedDatasources = datasources.saved_objects.map<StoredDatasource>(datasourceSO => {
      const datasource = {
        id: datasourceSO.id,
        ...datasourceSO.attributes,
      };
      const decoded = RuntimeStoredDatasource.decode(datasource);

      if (isRight(decoded)) {
        return decoded.right;
      } else {
        throw new Error(
          `Invalid DatasourceFile data. == ${JSON.stringify(datasource)}  -- ${PathReporter.report(
            decoded
          )}`
        );
      }
    });
    return {
      items: [...storedDatasources.values()],
      total: datasources.total,
      page,
      perPage,
    };
  }

  public async update(
    user: FrameworkUser,
    id: string,
    datasource: StoredDatasource
  ): Promise<StoredDatasource> {
    await this.so.update<StoredDatasource>(user, 'datasources', id, datasource);

    return datasource;
  }

  public async delete(user: FrameworkUser, id: string): Promise<void> {
    await this.so.delete(user, 'datasources', id);
  }
}
