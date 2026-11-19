/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';
import { inject, injectable } from 'inversify';
import type { ImportConfigSavedObjectAttributes } from '../../../saved_objects';
import {
  CONNECTOR_SAVED_OBJECT_TYPE,
  IMPORT_CONFIG_SAVED_OBJECT_TYPE,
} from '../../../saved_objects';
import { SpacesService } from '../spaces_service/spaces_service';
import { ImportConfigSavedObjectsClientToken } from './tokens';
import type {
  FindImportConfigSavedObjectsParams,
  FindImportConfigSavedObjectsResult,
  ImportConfigSavedObjectDoc,
  ImportConfigSavedObjectServiceContract,
  ImportConfigSavedObjectWriteResult,
} from './types';

export type {
  FindImportConfigSavedObjectsParams,
  FindImportConfigSavedObjectsResult,
  ImportConfigSavedObjectDoc,
  ImportConfigSavedObjectServiceContract,
  ImportConfigSavedObjectWriteResult,
};

const SEARCH_FIELDS = ['metadata.name', 'metadata.description'];
const DEFAULT_SORT_FIELD = 'metadata.name.keyword';

/** Reads and writes import config saved objects. Saved object errors propagate to the caller. */
@injectable()
export class ImportConfigSavedObjectService implements ImportConfigSavedObjectServiceContract {
  constructor(
    @inject(ImportConfigSavedObjectsClientToken)
    private readonly client: SavedObjectsClientContract,
    @inject(SpacesService) private readonly spacesService: SpacesService
  ) {}

  public async create({
    attrs,
    references,
    id,
  }: {
    attrs: ImportConfigSavedObjectAttributes;
    references: SavedObjectReference[];
    id?: string;
  }): Promise<ImportConfigSavedObjectWriteResult> {
    const result = await this.client.create<ImportConfigSavedObjectAttributes>(
      IMPORT_CONFIG_SAVED_OBJECT_TYPE,
      attrs,
      { id: id ?? SavedObjectsUtils.generateId(), overwrite: false, references }
    );
    return { id: result.id, version: result.version };
  }

  public async get(id: string, spaceId?: string): Promise<ImportConfigSavedObjectDoc> {
    const namespace = this.spacesService.spaceIdToNamespace(spaceId);
    const doc = await this.client.get<ImportConfigSavedObjectAttributes>(
      IMPORT_CONFIG_SAVED_OBJECT_TYPE,
      id,
      namespace ? { namespace } : undefined
    );
    return {
      id: doc.id,
      attributes: doc.attributes,
      version: doc.version,
      references: doc.references ?? [],
    };
  }

  public async update({
    id,
    attrs,
    references,
    version,
  }: {
    id: string;
    attrs: ImportConfigSavedObjectAttributes;
    references: SavedObjectReference[];
    version?: string;
  }): Promise<ImportConfigSavedObjectWriteResult> {
    const result = await this.client.update<ImportConfigSavedObjectAttributes>(
      IMPORT_CONFIG_SAVED_OBJECT_TYPE,
      id,
      attrs,
      { ...(version ? { version } : {}), mergeAttributes: false, references }
    );
    return { id: result.id, version: result.version };
  }

  public async delete({ id }: { id: string }): Promise<void> {
    await this.client.delete(IMPORT_CONFIG_SAVED_OBJECT_TYPE, id);
  }

  public async find({
    page,
    perPage,
    search,
    sortField = DEFAULT_SORT_FIELD,
    sortOrder = 'asc',
    connectorId,
  }: FindImportConfigSavedObjectsParams): Promise<FindImportConfigSavedObjectsResult> {
    const result = await this.client.find<ImportConfigSavedObjectAttributes>({
      type: IMPORT_CONFIG_SAVED_OBJECT_TYPE,
      page,
      perPage,
      sortField,
      sortOrder,
      ...(search
        ? { search, searchFields: SEARCH_FIELDS, defaultSearchOperator: 'AND' as const }
        : {}),
      ...(connectorId
        ? { hasReference: { type: CONNECTOR_SAVED_OBJECT_TYPE, id: connectorId } }
        : {}),
    });

    return {
      saved_objects: result.saved_objects.map((doc) => ({
        id: doc.id,
        attributes: doc.attributes,
        version: doc.version,
        references: doc.references ?? [],
      })),
      total: result.total,
    };
  }
}
