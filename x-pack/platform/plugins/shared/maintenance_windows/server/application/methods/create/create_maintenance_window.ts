/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { SavedObjectsUtils } from '@kbn/core/server';
import type { Filter } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { getEsQueryConfig } from '../../../lib/get_es_query_config';
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
import { getMaintenanceWindowExpirationDate } from '../../lib';
import { getDurationInMilliseconds } from '@kbn/maintenance-windows-plugin/server/routes/schemas/schedule';

export async function createMaintenanceWindow(
  context: MaintenanceWindowClientContext,
  params: CreateMaintenanceWindowParams
): Promise<MaintenanceWindow> {
  const { data } = params;
  const { savedObjectsClient, getModificationMetadata, logger, uiSettings } = context;
  const { title, schedule, scope, rRule, duration, enabled = true } = data;
  const esQueryConfig = await getEsQueryConfig(uiSettings);

  try {
    createMaintenanceWindowParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Error validating create maintenance window data - ${error.message}`);
  }

  let scopedQueryWithGeneratedValue = scope?.alerting;

  try {
    if (scope?.alerting) {
      const dsl = JSON.stringify(
        buildEsQuery(
          undefined,
          [{ query: scope.alerting.kql, language: 'kuery' }],
          scope.alerting.filters as Filter[],
          esQueryConfig
        )
      );

      scopedQueryWithGeneratedValue = {
        ...scope.alerting,
        dsl,
      };
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
    duration,
  });

  const modificationMetadata = await getModificationMetadata();

  const events = generateMaintenanceWindowEvents({
    schedule: schedule.custom,
    expirationDate,
    duration,
  });
  const maintenanceWindowAttributes = transformMaintenanceWindowToMaintenanceWindowAttributes({
    title,
    enabled,
    expirationDate,
    rRule,
    scopedQuery: scopedQueryWithGeneratedValue,
    duration,
    events,
    schedule,
    scope,
    ...modificationMetadata,
  });

  console.log('createMaintenanceWindow - ', { maintenanceWindowAttributes });

  try {
    const result = await createMaintenanceWindowSo({
      savedObjectsClient,
      maintenanceWindowAttributes,
      savedObjectsCreateOptions: {
        id,
      },
    });

    console.log('createMaintenanceWindow - SO ', { result });

    const res = transformMaintenanceWindowAttributesToMaintenanceWindow({
      attributes: result.attributes,
      id: result.id,
    });
    console.log('createMaintenanceWindow - transformed ', { res });
    return res;
  } catch (e) {
    const errorMessage = `Failed to create maintenance window, Error: ${e}`;
    logger.error(errorMessage);
    throw Boom.boomify(e, { message: errorMessage });
  }
}
