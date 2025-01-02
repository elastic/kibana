/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import Boom from '@hapi/boom';
import { SavedObjectsUtils } from '@kbn/core/server';
import { buildEsQuery, Filter } from '@kbn/es-query';
import { getEsQueryConfig } from '../../../../lib/get_es_query_config';
import { generateMaintenanceWindowEvents } from '../../lib/generate_maintenance_window_events';
import type { MaintenanceWindowClientContext } from '../../../../../common';
import { getScopedQueryErrorMessage } from '../../../../../common';
import type { MaintenanceWindow } from '../../types';
import type { CreateMaintenanceWindowParams } from './types';
import {
  transformMaintenanceWindowAttributesToMaintenanceWindow,
  transformMaintenanceWindowToMaintenanceWindowAttributes,
} from '../../transforms';
import { createMaintenanceWindowSo } from '../../../../data/maintenance_window';
import { createMaintenanceWindowParamsSchema } from './schemas';

export async function createMaintenanceWindow(
  context: MaintenanceWindowClientContext,
  params: CreateMaintenanceWindowParams
): Promise<MaintenanceWindow> {
  const { data } = params;
  const { savedObjectsClient, getModificationMetadata, logger, uiSettings } = context;
  const { title, duration, rRule, categoryIds, scopedQuery } = data;
  const esQueryConfig = await getEsQueryConfig(uiSettings);

  try {
    createMaintenanceWindowParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Error validating create maintenance window data - ${error.message}`);
  }

  let scopedQueryWithGeneratedValue = scopedQuery;

  try {
    if (scopedQuery) {
      const dsl = JSON.stringify(
        buildEsQuery(
          undefined,
          [{ query: scopedQuery.kql, language: 'kuery' }],
          scopedQuery.filters as Filter[],
          esQueryConfig
        )
      );

      scopedQueryWithGeneratedValue = {
        ...scopedQuery,
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

  if (scopedQueryWithGeneratedValue) {
    if (data.categoryIds?.length !== 1) {
      throw Boom.badRequest(
        `Error validating create maintenance window data - scoped query must be accompanied by 1 category ID`
      );
    }
  }

  const id = SavedObjectsUtils.generateId();
  const expirationDate = moment().utc().add(1, 'year').toISOString();
  const modificationMetadata = await getModificationMetadata();

  const events = generateMaintenanceWindowEvents({ rRule, expirationDate, duration });
  const maintenanceWindowAttributes = transformMaintenanceWindowToMaintenanceWindowAttributes({
    title,
    enabled: true,
    expirationDate,
    categoryIds,
    scopedQuery: scopedQueryWithGeneratedValue,
    rRule: rRule as MaintenanceWindow['rRule'],
    duration,
    events,
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
