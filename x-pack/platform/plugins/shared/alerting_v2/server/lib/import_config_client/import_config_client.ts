/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { ImportResponse } from '@kbn/alerting-v2-schemas';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { inject, injectable } from 'inversify';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
import {
  getImportNotFoundMessage,
  getImportVersionConflictMessage,
} from '../errors/import_error_messages';
import { ImportConfigSavedObjectServiceScopedToken } from '../services/import_config_saved_object_service/tokens';
import type { ImportConfigSavedObjectServiceContract } from '../services/import_config_saved_object_service/types';
import { UserService } from '../services/user_service/user_service';
import type { UserServiceContract } from '../services/user_service/user_service';
import type {
  CreateImportConfigParams,
  FindImportConfigsArgs,
  FindImportConfigsResponse,
  UpdateImportConfigParams,
} from './types';
import {
  buildCreateImportConfigAttributes,
  transformImportConfigSoAttributesToApiResponse,
} from './utils';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;

/**
 * Reads and writes the import config records. Creating the connector and workflow an import
 * needs is the job of the import setup service, which calls this last.
 */
@injectable()
export class ImportConfigClient {
  constructor(
    @inject(ImportConfigSavedObjectServiceScopedToken)
    private readonly importConfigSavedObjectService: ImportConfigSavedObjectServiceContract,
    @inject(UserService) private readonly userService: UserServiceContract
  ) {}

  public async createImportConfig(params: CreateImportConfigParams): Promise<ImportResponse> {
    const actor = await this.userService.getCurrentActor();
    const attributes = buildCreateImportConfigAttributes({
      params,
      actor,
      now: new Date().toISOString(),
    });

    const { id } = await this.importConfigSavedObjectService.create({
      attrs: attributes,
      id: params.id,
    });

    return transformImportConfigSoAttributesToApiResponse({ id, attributes });
  }

  public async getImportConfig({ id }: { id: string }): Promise<ImportResponse> {
    try {
      const doc = await this.importConfigSavedObjectService.get(id);
      return transformImportConfigSoAttributesToApiResponse({
        id: doc.id,
        attributes: doc.attributes,
      });
    } catch (e) {
      throw this.mapNotFound(id, e);
    }
  }

  public async findImportConfigs({
    page = DEFAULT_PAGE,
    perPage = DEFAULT_PER_PAGE,
    search,
  }: FindImportConfigsArgs = {}): Promise<FindImportConfigsResponse> {
    const result = await this.importConfigSavedObjectService.find({ page, perPage, search });

    return {
      items: result.saved_objects.map(({ id, attributes }) =>
        transformImportConfigSoAttributesToApiResponse({ id, attributes })
      ),
      total: result.total,
      page,
      perPage,
    };
  }

  public async updateImportConfig({ id, data }: UpdateImportConfigParams): Promise<ImportResponse> {
    try {
      const existing = await this.importConfigSavedObjectService.get(id);
      const actor = await this.userService.getCurrentActor();
      const attributes = {
        ...existing.attributes,
        ...data,
        updated_by: actor,
        updated_at: new Date().toISOString(),
      };

      await this.importConfigSavedObjectService.update({
        id,
        attrs: attributes,
        version: existing.version,
      });

      return transformImportConfigSoAttributesToApiResponse({ id, attributes });
    } catch (e) {
      throw this.mapNotFound(id, e);
    }
  }

  public async deleteImportConfig({ id }: { id: string }): Promise<void> {
    try {
      await this.importConfigSavedObjectService.delete({ id });
    } catch (e) {
      throw this.mapNotFound(id, e);
    }
  }

  private mapNotFound(id: string, e: unknown): unknown {
    if (!(e instanceof Error)) {
      return e;
    }
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
      return Boom.notFound(getImportNotFoundMessage(id), {
        code: ALERTING_ERROR_CODES.IMPORT_NOT_FOUND,
        details: { import_id: id },
      });
    }
    if (SavedObjectsErrorHelpers.isConflictError(e)) {
      return Boom.conflict(getImportVersionConflictMessage(id), {
        code: ALERTING_ERROR_CODES.IMPORT_VERSION_CONFLICT,
        details: { import_id: id },
      });
    }
    return e;
  }
}
