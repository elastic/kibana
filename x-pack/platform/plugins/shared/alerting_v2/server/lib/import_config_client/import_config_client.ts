/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { ImportConfigResponse } from '@kbn/alerting-v2-schemas';
import {
  createImportConfigDataSchema,
  updateImportConfigDataSchema,
} from '@kbn/alerting-v2-schemas';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { stringifyZodError } from '@kbn/zod-helpers/v4';
import { treeifyError, type z } from '@kbn/zod/v4';
import { inject, injectable } from 'inversify';
import { withApm as withApmDecorator } from '../apm/with_apm_decorator';
import { applyPatch } from '../apply_patch';
import { buildSoSearch } from '../build_so_search';
import { ALERTING_ERROR_CODES, ALERTING_LOG_CODES } from '../errors/error_codes';
import {
  getImportConfigAlreadyExistsMessage,
  getImportConfigNotFoundMessage,
  getImportConfigVersionConflictMessage,
  getInvalidImportConfigDataMessage,
  type ImportConfigValidationContext,
} from '../errors/import_config_error_messages';
import { ImportConfigSavedObjectServiceScopedToken } from '../services/import_config_saved_object_service/tokens';
import type {
  ImportConfigSavedObjectDoc,
  ImportConfigSavedObjectServiceContract,
} from '../services/import_config_saved_object_service/types';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import type { UserServiceContract } from '../services/user_service/user_service';
import { UserService } from '../services/user_service/user_service';
import type {
  CreateImportConfigParams,
  FindImportConfigsParams,
  FindImportConfigsResponse,
  UpdateImportConfigParams,
} from './types';
import {
  buildCreateImportConfigAttributes,
  buildImportConfigReferences,
  buildUpdateImportConfigAttributes,
  getConnectorIdFromReferences,
  mapImportConfigSortField,
  toImportConfigData,
  transformImportConfigToApiResponse,
} from './utils';

const withApm = withApmDecorator('ImportConfigClient');

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;

/**
 * CRUD for alert import configs: the configuration of one source of external alerts, such as a
 * Datadog connector that receives events.
 *
 * The connector is stored twice: as the `connector_id` attribute and as a `connector` saved object
 * reference. Every write sets both. Every read takes the connector id from the reference, which
 * saved object import and copy to space keep up to date, and falls back to the attribute only when
 * the reference is missing.
 */
@injectable()
export class ImportConfigClient {
  private readonly logger: LoggerServiceContract;

  constructor(
    @inject(ImportConfigSavedObjectServiceScopedToken)
    private readonly importConfigSavedObjectService: ImportConfigSavedObjectServiceContract,
    @inject(UserService) private readonly userService: UserServiceContract,
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract
  ) {
    this.logger = loggerService.forSubsystem('importConfigClient');
  }

  @withApm
  public async createImportConfig(params: CreateImportConfigParams): Promise<ImportConfigResponse> {
    const { id, ...data } = this.parseImportConfigData(
      createImportConfigDataSchema,
      params.data,
      'create'
    );
    const actor = await this.userService.getCurrentActor();
    const attributes = buildCreateImportConfigAttributes({
      data,
      actor,
      now: new Date().toISOString(),
    });

    let createdId: string;
    try {
      ({ id: createdId } = await this.importConfigSavedObjectService.create({
        attrs: attributes,
        references: buildImportConfigReferences(data.connector_id),
        id,
      }));
    } catch (e) {
      if (id && SavedObjectsErrorHelpers.isConflictError(e)) {
        throw Boom.conflict(getImportConfigAlreadyExistsMessage(id), {
          code: ALERTING_ERROR_CODES.IMPORT_CONFIG_ALREADY_EXISTS,
          details: { import_config_id: id },
        });
      }
      throw e;
    }

    return transformImportConfigToApiResponse({
      id: createdId,
      attributes,
      connectorId: data.connector_id,
    });
  }

  @withApm
  public async getImportConfig({ id }: { id: string }): Promise<ImportConfigResponse> {
    const doc = await this.getExistingImportConfig(id);
    return transformImportConfigToApiResponse({
      id: doc.id,
      attributes: doc.attributes,
      connectorId: this.resolveConnectorId(doc),
    });
  }

  @withApm
  public async updateImportConfig(params: UpdateImportConfigParams): Promise<ImportConfigResponse> {
    const patch = this.parseImportConfigData(updateImportConfigDataSchema, params.data, 'update');
    const actor = await this.userService.getCurrentActor();
    const existing = await this.getExistingImportConfig(params.id);
    const connectorId = this.resolveConnectorId(existing);

    const merged = applyPatch(
      createImportConfigDataSchema,
      toImportConfigData(existing.attributes, connectorId),
      patch
    );
    const {
      kind,
      metadata,
      connector_id: mergedConnectorId,
    } = this.parseImportConfigData(createImportConfigDataSchema, merged, 'update');
    const data = { kind, metadata, connector_id: mergedConnectorId };

    const attributes = buildUpdateImportConfigAttributes({
      existing: existing.attributes,
      data,
      actor,
      now: new Date().toISOString(),
    });

    try {
      await this.importConfigSavedObjectService.update({
        id: params.id,
        attrs: attributes,
        references: buildImportConfigReferences(data.connector_id),
        version: existing.version,
      });
    } catch (e) {
      if (SavedObjectsErrorHelpers.isConflictError(e)) {
        throw Boom.conflict(getImportConfigVersionConflictMessage(params.id), {
          code: ALERTING_ERROR_CODES.IMPORT_CONFIG_VERSION_CONFLICT,
          details: { import_config_id: params.id },
        });
      }
      throw e;
    }

    return transformImportConfigToApiResponse({
      id: params.id,
      attributes,
      connectorId: data.connector_id,
    });
  }

  @withApm
  public async deleteImportConfig({ id }: { id: string }): Promise<void> {
    try {
      await this.importConfigSavedObjectService.delete({ id });
    } catch (e) {
      throw this.mapNotFound(id, e);
    }
  }

  @withApm
  public async findImportConfigs(
    params: FindImportConfigsParams = {}
  ): Promise<FindImportConfigsResponse> {
    const page = params.page ?? DEFAULT_PAGE;
    const perPage = params.perPage ?? DEFAULT_PER_PAGE;

    const result = await this.importConfigSavedObjectService.find({
      page,
      perPage,
      search: buildSoSearch(params.search),
      sortField: mapImportConfigSortField(params.sortField),
      sortOrder: params.sortOrder,
      connectorId: params.connectorId,
    });

    return {
      items: result.saved_objects.map((doc) =>
        transformImportConfigToApiResponse({
          id: doc.id,
          attributes: doc.attributes,
          connectorId: this.resolveConnectorId(doc),
        })
      ),
      total: result.total,
      page,
      per_page: perPage,
    };
  }

  /**
   * Validates input with a Zod schema and throws a uniform `Boom.badRequest` on failure, so create
   * and update report validation issues the same way.
   */
  private parseImportConfigData<T>(
    schema: z.ZodType<T>,
    data: unknown,
    context: ImportConfigValidationContext
  ): T {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw Boom.badRequest(
        getInvalidImportConfigDataMessage(context, stringifyZodError(parsed.error)),
        {
          code: ALERTING_ERROR_CODES.INVALID_IMPORT_CONFIG_DATA,
          details: { context, errors: treeifyError(parsed.error) },
        }
      );
    }
    return parsed.data;
  }

  private async getExistingImportConfig(id: string): Promise<ImportConfigSavedObjectDoc> {
    try {
      return await this.importConfigSavedObjectService.get(id);
    } catch (e) {
      throw this.mapNotFound(id, e);
    }
  }

  private mapNotFound(id: string, e: unknown): unknown {
    if (e instanceof Error && SavedObjectsErrorHelpers.isNotFoundError(e)) {
      return Boom.notFound(getImportConfigNotFoundMessage(id), {
        code: ALERTING_ERROR_CODES.IMPORT_CONFIG_NOT_FOUND,
        details: { import_config_id: id },
      });
    }
    return e;
  }

  /**
   * Returns the connector id from the `connector` reference. A missing reference is logged and
   * the stored attribute is used instead, since it is the only other copy.
   */
  private resolveConnectorId(doc: ImportConfigSavedObjectDoc): string {
    const connectorId = getConnectorIdFromReferences(doc.references);
    if (connectorId !== undefined) {
      return connectorId;
    }

    this.logger.warn({
      message: 'Import config has no connector reference; using the stored connector id',
      code: ALERTING_LOG_CODES.IMPORT_CONFIG_CONNECTOR_REFERENCE_NOT_FOUND,
      labels: { import_config_id: doc.id, connector_id: doc.attributes.connector_id },
    });
    return doc.attributes.connector_id;
  }
}
