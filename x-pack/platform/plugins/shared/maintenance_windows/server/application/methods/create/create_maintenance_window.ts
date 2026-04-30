/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { SavedObjectsUtils } from '@kbn/core/server';
import { getEsQueryConfig } from '../../../lib/get_es_query_config';
import { getAlertsDataViewBase } from '../../../lib/get_alerts_data_view_base';
import { generateMaintenanceWindowEvents } from '../../lib/generate_maintenance_window_events';
import type { MaintenanceWindowClientContext } from '../../../../common';
import { getScopedQueryErrorMessage } from '../../../../common';
import type { MaintenanceWindow } from '../../types';
import type { CreateMaintenanceWindowParams } from './types';
import {
  transformMaintenanceWindowAttributesToMaintenanceWindow,
  transformMaintenanceWindowToMaintenanceWindowAttributes,
} from '../../transforms';
import { createMaintenanceWindowSo } from '../../../data';
import { createMaintenanceWindowParamsSchema } from './schemas';
import { buildScopeWithDsl, getMaintenanceWindowExpirationDate } from '../../lib';

export async function createMaintenanceWindow(
  context: MaintenanceWindowClientContext,
  params: CreateMaintenanceWindowParams
): Promise<MaintenanceWindow> {
  const { data } = params;
  const { savedObjectsClient, getModificationMetadata, logger, uiSettings } = context;
  const { title, schedule, scope, rRule, categoryIds, duration, enabled = true } = data;
  const esQueryConfig = await getEsQueryConfig(uiSettings);

  try {
    createMaintenanceWindowParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Error validating create maintenance window data - ${error.message}`);
  }

  let scopedQueryWithGeneratedValue = scope?.alerting;
  let scopeEpisodesWithGeneratedValue = scope?.episodes;
  const indexPattern = getAlertsDataViewBase();

  try {
    if (scope?.alerting) {
      scopedQueryWithGeneratedValue = buildScopeWithDsl(
        scope.alerting,
        indexPattern,
        esQueryConfig
      );
    }
    if (scope?.episodes) {
      scopeEpisodesWithGeneratedValue = buildScopeWithDsl(
        scope.episodes,
        indexPattern,
        esQueryConfig
      );
    }
  } catch (error) {
    throw Boom.badRequest(
      `Error validating create maintenance window data - ${getScopedQueryErrorMessage(
        error.message
      )}`
    );
  }

  const id = SavedObjectsUtils.generateId();

  const expirationDate = getMaintenanceWindowExpirationDate({
    schedule: schedule.custom,
  });

  const modificationMetadata = await getModificationMetadata();

  const events = generateMaintenanceWindowEvents({
    schedule: schedule.custom,
    expirationDate,
  });
  const scopeForAttributes =
    scopedQueryWithGeneratedValue || scopeEpisodesWithGeneratedValue
      ? {
          ...(scopedQueryWithGeneratedValue ? { alerting: scopedQueryWithGeneratedValue } : {}),
          ...(scopeEpisodesWithGeneratedValue ? { episodes: scopeEpisodesWithGeneratedValue } : {}),
        }
      : undefined;

  const maintenanceWindowAttributes = transformMaintenanceWindowToMaintenanceWindowAttributes({
    title,
    enabled,
    expirationDate,
    categoryIds,
    scopedQuery: scopedQueryWithGeneratedValue,
    rRule,
    duration,
    events,
    schedule,
    ...(scopeForAttributes ? { scope: scopeForAttributes } : {}),
    ...modificationMetadata,
  });

  try {
    const result = await createMaintenanceWindowSo({
      savedObjectsClient,
      maintenanceWindowAttributes,
      savedObjectsCreateOptions: {
        id,
      },
    });

    return transformMaintenanceWindowAttributesToMaintenanceWindow({
      attributes: result.attributes,
      id: result.id,
    });
  } catch (e) {
    const errorMessage = `Failed to create maintenance window, Error: ${e}`;
    logger.error(errorMessage);
    throw Boom.boomify(e, { message: errorMessage });
  }
}
