/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginStart } from '@kbn/core-di';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { inject, injectable } from 'inversify';
import type { ImportConfigSavedObjectAttributes } from '../../../saved_objects';
import { IMPORT_CONFIG_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { AlertingServerStartDependencies } from '../../../types';
import { spaceIdToNamespace } from '../../space_id_to_namespace';
import { ImportConfigSavedObjectsClientToken } from './tokens';
import type { ImportConfigSavedObjectServiceContract } from './types';

export type { ImportConfigSavedObjectServiceContract };

@injectable()
export class ImportConfigSavedObjectService implements ImportConfigSavedObjectServiceContract {
  constructor(
    @inject(ImportConfigSavedObjectsClientToken)
    private readonly client: SavedObjectsClientContract,
    @inject(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'))
    private readonly spaces: SpacesPluginStart
  ) {}

  public async create({
    attrs,
    id,
  }: {
    attrs: ImportConfigSavedObjectAttributes;
    id?: string;
  }): Promise<{ id: string; version?: string }> {
    const result = await this.client.create<ImportConfigSavedObjectAttributes>(
      IMPORT_CONFIG_SAVED_OBJECT_TYPE,
      attrs,
      { id: id ?? SavedObjectsUtils.generateId(), overwrite: false }
    );

    return { id: result.id, version: result.version };
  }

  public async get(
    id: string,
    spaceId?: string
  ): Promise<{
    id: string;
    attributes: ImportConfigSavedObjectAttributes;
    version?: string;
  }> {
    const namespace = spaceIdToNamespace(this.spaces, spaceId);
    const doc = await this.client.get<ImportConfigSavedObjectAttributes>(
      IMPORT_CONFIG_SAVED_OBJECT_TYPE,
      id,
      namespace ? { namespace } : undefined
    );
    return { id: doc.id, attributes: doc.attributes, version: doc.version };
  }

  public async update({
    id,
    attrs,
    version,
  }: {
    id: string;
    attrs: Partial<ImportConfigSavedObjectAttributes>;
    version?: string;
  }): Promise<{ id: string; version?: string }> {
    const result = await this.client.update<ImportConfigSavedObjectAttributes>(
      IMPORT_CONFIG_SAVED_OBJECT_TYPE,
      id,
      attrs,
      version ? { version } : undefined
    );

    return { id: result.id, version: result.version };
  }

  public async delete({ id }: { id: string }): Promise<void> {
    await this.client.delete(IMPORT_CONFIG_SAVED_OBJECT_TYPE, id);
  }

  public async find({ page, perPage, search }: { page: number; perPage: number; search?: string }) {
    return this.client.find<ImportConfigSavedObjectAttributes>({
      type: IMPORT_CONFIG_SAVED_OBJECT_TYPE,
      page,
      perPage,
      ...(search
        ? {
            search,
            searchFields: ['name', 'description'],
            defaultSearchOperator: 'AND' as const,
          }
        : {}),
      sortField: 'name.keyword',
      sortOrder: 'asc',
    });
  }
}
