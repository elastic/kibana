/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memorize } from '@mattapperson/slapshot/lib/memorize';
import { StoredDatasource } from './adapter_types';
import { DatasourceAdapter } from './default';
import { FrameworkUser } from '../framework/adapter_types';
import { ListOptions } from '../../../../../fleet/server/repositories/agents/types';

export class MemorizedDatasourceAdapter {
  constructor(private readonly adapter?: DatasourceAdapter) {}

  public async create(
    user: FrameworkUser,
    datasource: StoredDatasource,
    options?: { id?: string }
  ): Promise<StoredDatasource> {
    return await memorize(
      `create - ${JSON.stringify({ name: datasource.name, package: datasource.package.name })}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.create(user, datasource, options);
      },
      {
        pure: false,
      }
    );
  }

  public async get(user: FrameworkUser, id: string): Promise<StoredDatasource | null> {
    return await memorize(
      `get - ${JSON.stringify(id)}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.get(user, id);
      },
      {
        pure: false,
      }
    );
  }

  public async getByIDs(user: FrameworkUser, ids: string[]): Promise<StoredDatasource[] | null> {
    return await memorize(
      `get by IDs - ${JSON.stringify(ids)}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.getByIDs(user, ids);
      },
      {
        pure: false,
      }
    );
  }

  public async list(
    user: FrameworkUser,
    options: ListOptions = {}
  ): Promise<{ items: StoredDatasource[]; total: number }> {
    return await memorize(
      `list - ${JSON.stringify({ username: (user as any).username || user.kind, options })}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.list(user, options);
      },
      {
        pure: false,
      }
    );
  }

  public async update(
    user: FrameworkUser,
    id: string,
    datasource: StoredDatasource
  ): Promise<StoredDatasource> {
    return await memorize(
      `update - ${JSON.stringify({ name: datasource.name, package: datasource.package.name })}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.update(user, id, datasource);
      },
      {
        pure: false,
      }
    );
  }

  public async delete(user: FrameworkUser, id: string): Promise<void> {
    return await memorize(
      `delete - ${id}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.delete(user, id);
      },
      {
        pure: true,
      }
    );
  }
}
