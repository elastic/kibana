/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { ExternalSourceResponse } from '@kbn/alerting-v2-schemas';
import {
  createExternalSourceDataSchema,
  updateExternalSourceDataSchema,
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
  getExternalSourceAlreadyExistsMessage,
  getExternalSourceNotFoundMessage,
  getExternalSourceVersionConflictMessage,
  getInvalidExternalSourceDataMessage,
  type ExternalSourceValidationContext,
} from '../errors/external_source_error_messages';
import { ExternalSourceSavedObjectServiceScopedToken } from '../services/external_source_saved_object_service/tokens';
import type {
  ExternalSourceSavedObjectDoc,
  ExternalSourceSavedObjectServiceContract,
} from '../services/external_source_saved_object_service/types';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import type { UserServiceContract } from '../services/user_service/user_service';
import { UserService } from '../services/user_service/user_service';
import type {
  CreateExternalSourceParams,
  FindExternalSourcesParams,
  FindExternalSourcesResponse,
  UpdateExternalSourceParams,
} from './types';
import {
  buildCreateExternalSourceAttributes,
  buildExternalSourceReferences,
  buildUpdateExternalSourceAttributes,
  getConnectorIdFromReferences,
  mapExternalSourceSortField,
  toExternalSourceData,
  transformExternalSourceToApiResponse,
} from './utils';

const withApm = withApmDecorator('ExternalSourceClient');

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;

/**
 * CRUD for alert external sources: the configuration of one source of external alerts, such as a
 * Datadog connector that receives events.
 *
 * The connector is stored twice: as the `connector_id` attribute and as a `connector` saved object
 * reference. Every write sets both. Every read takes the connector id from the reference, and falls
 * back to the attribute only when the reference is missing. The reference lets Kibana know the
 * connector is in use, so the connectors management page can warn before it is deleted.
 */
@injectable()
export class ExternalSourceClient {
  private readonly logger: LoggerServiceContract;

  constructor(
    @inject(ExternalSourceSavedObjectServiceScopedToken)
    private readonly externalSourceSavedObjectService: ExternalSourceSavedObjectServiceContract,
    @inject(UserService) private readonly userService: UserServiceContract,
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract
  ) {
    this.logger = loggerService.forSubsystem('externalSourceClient');
  }

  @withApm
  public async createExternalSource(
    params: CreateExternalSourceParams
  ): Promise<ExternalSourceResponse> {
    const { id, ...data } = this.parseExternalSourceData(
      createExternalSourceDataSchema,
      params.data,
      'create'
    );
    const actor = await this.userService.getCurrentActor();
    const attributes = buildCreateExternalSourceAttributes({
      data,
      actor,
      now: new Date().toISOString(),
    });

    let createdId: string;
    try {
      ({ id: createdId } = await this.externalSourceSavedObjectService.create({
        attrs: attributes,
        references: buildExternalSourceReferences(data.connector_id),
        id,
      }));
    } catch (e) {
      if (id && SavedObjectsErrorHelpers.isConflictError(e)) {
        throw Boom.conflict(getExternalSourceAlreadyExistsMessage(id), {
          code: ALERTING_ERROR_CODES.EXTERNAL_SOURCE_ALREADY_EXISTS,
          details: { external_source_id: id },
        });
      }
      throw e;
    }

    return transformExternalSourceToApiResponse({
      id: createdId,
      attributes,
      connectorId: data.connector_id,
    });
  }

  @withApm
  public async getExternalSource({ id }: { id: string }): Promise<ExternalSourceResponse> {
    const doc = await this.getExistingExternalSource(id);
    return transformExternalSourceToApiResponse({
      id: doc.id,
      attributes: doc.attributes,
      connectorId: this.resolveConnectorId(doc),
    });
  }

  @withApm
  public async updateExternalSource(
    params: UpdateExternalSourceParams
  ): Promise<ExternalSourceResponse> {
    const patch = this.parseExternalSourceData(
      updateExternalSourceDataSchema,
      params.data,
      'update'
    );
    const actor = await this.userService.getCurrentActor();
    const existing = await this.getExistingExternalSource(params.id);
    const connectorId = this.resolveConnectorId(existing);

    const merged = applyPatch(
      createExternalSourceDataSchema,
      toExternalSourceData(existing.attributes, connectorId),
      patch
    );
    const {
      type,
      kind,
      metadata,
      connector_id: mergedConnectorId,
    } = this.parseExternalSourceData(createExternalSourceDataSchema, merged, 'update');
    const data = { type, kind, metadata, connector_id: mergedConnectorId };

    const attributes = buildUpdateExternalSourceAttributes({
      existing: existing.attributes,
      data,
      actor,
      now: new Date().toISOString(),
    });

    try {
      await this.externalSourceSavedObjectService.update({
        id: params.id,
        attrs: attributes,
        references: buildExternalSourceReferences(data.connector_id),
        version: existing.version,
      });
    } catch (e) {
      if (SavedObjectsErrorHelpers.isConflictError(e)) {
        throw Boom.conflict(getExternalSourceVersionConflictMessage(params.id), {
          code: ALERTING_ERROR_CODES.EXTERNAL_SOURCE_VERSION_CONFLICT,
          details: { external_source_id: params.id },
        });
      }
      throw this.mapNotFound(params.id, e);
    }

    return transformExternalSourceToApiResponse({
      id: params.id,
      attributes,
      connectorId: data.connector_id,
    });
  }

  @withApm
  public async deleteExternalSource({ id }: { id: string }): Promise<void> {
    try {
      await this.externalSourceSavedObjectService.delete({ id });
    } catch (e) {
      throw this.mapNotFound(id, e);
    }
  }

  @withApm
  public async findExternalSources(
    params: FindExternalSourcesParams = {}
  ): Promise<FindExternalSourcesResponse> {
    const page = params.page ?? DEFAULT_PAGE;
    const perPage = params.perPage ?? DEFAULT_PER_PAGE;

    const result = await this.externalSourceSavedObjectService.find({
      page,
      perPage,
      search: buildSoSearch(params.search),
      sortField: mapExternalSourceSortField(params.sortField),
      sortOrder: params.sortOrder,
      connectorId: params.connectorId,
      type: params.type,
    });

    return {
      items: result.saved_objects.map((doc) =>
        transformExternalSourceToApiResponse({
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
  private parseExternalSourceData<T>(
    schema: z.ZodType<T>,
    data: unknown,
    context: ExternalSourceValidationContext
  ): T {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw Boom.badRequest(
        getInvalidExternalSourceDataMessage(context, stringifyZodError(parsed.error)),
        {
          code: ALERTING_ERROR_CODES.INVALID_EXTERNAL_SOURCE_DATA,
          details: { context, errors: treeifyError(parsed.error) },
        }
      );
    }
    return parsed.data;
  }

  private async getExistingExternalSource(id: string): Promise<ExternalSourceSavedObjectDoc> {
    try {
      return await this.externalSourceSavedObjectService.get(id);
    } catch (e) {
      throw this.mapNotFound(id, e);
    }
  }

  private mapNotFound(id: string, e: unknown): unknown {
    if (e instanceof Error && SavedObjectsErrorHelpers.isNotFoundError(e)) {
      return Boom.notFound(getExternalSourceNotFoundMessage(id), {
        code: ALERTING_ERROR_CODES.EXTERNAL_SOURCE_NOT_FOUND,
        details: { external_source_id: id },
      });
    }
    return e;
  }

  /**
   * Returns the connector id from the `connector` reference. A missing reference is logged and
   * the stored attribute is used instead, since it is the only other copy.
   */
  private resolveConnectorId(doc: ExternalSourceSavedObjectDoc): string {
    const connectorId = getConnectorIdFromReferences(doc.references);
    if (connectorId !== undefined) {
      return connectorId;
    }

    this.logger.warn({
      message: 'External source has no connector reference; using the stored connector id',
      code: ALERTING_LOG_CODES.EXTERNAL_SOURCE_CONNECTOR_REFERENCE_NOT_FOUND,
      labels: { external_source_id: doc.id, connector_id: doc.attributes.connector_id },
    });
    return doc.attributes.connector_id;
  }
}
