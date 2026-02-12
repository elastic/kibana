/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import { termQuery } from '@kbn/es-query';
import type {
  IStorageClient,
  StorageClientDeleteResponse,
  StorageClientIndexResponse,
} from '@kbn/storage-adapter';
import type { System } from '@kbn/streams-schema';
import {
  STREAM_NAME,
  SYSTEM_DESCRIPTION,
  SYSTEM_FILTER,
  SYSTEM_NAME,
  SYSTEM_TYPE,
  SYSTEM_UUID,
} from './fields';
import type { SystemStorageSettings } from './storage_settings';
import type { StoredSystem } from './stored_system';
import { SystemNotFoundError } from '../errors/system_not_found_error';

interface SystemBulkIndexOperation {
  index: { system: System };
}
interface SystemBulkDeleteOperation {
  delete: { system: { name: string } };
}

export type SystemBulkOperation = SystemBulkIndexOperation | SystemBulkDeleteOperation;

export class SystemClient {
  constructor(
    private readonly clients: {
      storageClient: IStorageClient<SystemStorageSettings, StoredSystem>;
    }
  ) {}

  private getSystemUuid(streamName: string, systemName: string): string {
    return objectHash({
      [STREAM_NAME]: streamName,
      [SYSTEM_NAME]: systemName,
    });
  }

  private fromStorage(stored: StoredSystem): System {
    return {
      type: stored[SYSTEM_TYPE] as 'system',
      name: stored[SYSTEM_NAME],
      description: stored[SYSTEM_DESCRIPTION],
      filter: stored[SYSTEM_FILTER]!,
    };
  }

  private toStorage(streamName: string, system: System): StoredSystem {
    return {
      [STREAM_NAME]: streamName,
      [SYSTEM_UUID]: this.getSystemUuid(streamName, system.name),
      [SYSTEM_TYPE]: system.type,
      [SYSTEM_NAME]: system.name,
      [SYSTEM_DESCRIPTION]: system.description,
      [SYSTEM_FILTER]: system.filter,
    };
  }

  async syncSystemList(
    name: string,
    systems: System[]
  ): Promise<{ deleted: System[]; indexed: System[] }> {
    const systemsResponse = await this.clients.storageClient.search({
      size: 10_000,
      track_total_hits: false,
      query: {
        bool: {
          filter: [...termQuery(STREAM_NAME, name)],
        },
      },
    });

    const existingSystems = systemsResponse.hits.hits.map((hit) => {
      return hit._source;
    });

    const nextSystems = systems.map((system) => {
      return this.toStorage(name, system);
    });

    const nextIds = new Set(nextSystems.map((system) => system[SYSTEM_UUID]));
    const systemsDeleted = existingSystems.filter((system) => !nextIds.has(system[SYSTEM_UUID]));

    const operations: SystemBulkOperation[] = [
      ...systemsDeleted.map((system) => ({
        delete: { system: this.fromStorage(system), name },
      })),
      ...nextSystems.map((system) => ({
        index: { system: this.fromStorage(system), name },
      })),
    ];

    if (operations.length) {
      await this.bulk(name, operations);
    }

    return {
      deleted: systemsDeleted.map((system) => this.fromStorage(system)),
      indexed: systems,
    };
  }

  async linkSystem(name: string, system: System): Promise<System> {
    const document = this.toStorage(name, system);

    await this.clients.storageClient.index({
      id: document[SYSTEM_UUID],
      document,
    });

    return system;
  }

  async unlinkSystem(name: string, system: System): Promise<void> {
    const id = this.getSystemUuid(name, system.name);

    const { result } = await this.clients.storageClient.delete({ id });
    if (result === 'not_found') {
      throw new SystemNotFoundError(`System ${system.name} not found for stream ${name}`);
    }
  }

  async clean() {
    await this.clients.storageClient.clean();
  }

  async bulk(name: string, operations: SystemBulkOperation[]) {
    return await this.clients.storageClient.bulk({
      operations: operations.map((operation) => {
        if ('index' in operation) {
          const document = this.toStorage(name, operation.index.system);
          return {
            index: {
              document,
              _id: document[SYSTEM_UUID],
            },
          };
        }

        const id = this.getSystemUuid(name, operation.delete.system.name);
        return {
          delete: {
            _id: id,
          },
        };
      }),
      throwOnFail: true,
    });
  }

  async getSystem(name: string, systemName: string): Promise<System> {
    const id = this.getSystemUuid(name, systemName);
    const hit = await this.clients.storageClient.get({ id });

    return this.fromStorage(hit._source!);
  }

  async deleteSystem(name: string, systemName: string): Promise<StorageClientDeleteResponse> {
    const id = this.getSystemUuid(name, systemName);
    return await this.clients.storageClient.delete({ id });
  }

  async updateSystem(name: string, system: System): Promise<StorageClientIndexResponse> {
    const id = this.getSystemUuid(name, system.name);
    return await this.clients.storageClient.index({
      document: this.toStorage(name, system),
      id,
    });
  }

  async getSystems(name: string): Promise<{ systems: System[]; total: number }> {
    const systemsResponse = await this.clients.storageClient.search({
      size: 10_000,
      track_total_hits: true,
      query: {
        bool: {
          filter: [...termQuery(STREAM_NAME, name)],
        },
      },
    });

    return {
      systems: systemsResponse.hits.hits.map((hit) => this.fromStorage(hit._source)),
      total: systemsResponse.hits.total.value,
    };
  }
}
