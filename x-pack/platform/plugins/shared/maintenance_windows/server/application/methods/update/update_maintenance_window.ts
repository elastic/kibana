/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import Boom from '@hapi/boom';
import type { Filter } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import type { MaintenanceWindowClientContext } from '../../../../common';
import { getScopedQueryErrorMessage } from '../../../../common';
import { getEsQueryConfig } from '../../../lib/get_es_query_config';
import type { MaintenanceWindow } from '../../types';
import {
  generateMaintenanceWindowEvents,
  shouldRegenerateEvents,
  mergeEvents,
  getMaintenanceWindowExpirationDate,
} from '../../lib';
import { retryIfConflicts } from '../../../lib/retry_if_conflicts';
import {
  transformMaintenanceWindowAttributesToMaintenanceWindow,
  transformMaintenanceWindowToMaintenanceWindowAttributes,
} from '../../transforms';
import { getMaintenanceWindowSo, createMaintenanceWindowSo } from '../../../data';
import type { UpdateMaintenanceWindowParams } from './types';
import { updateMaintenanceWindowParamsSchema } from './schemas';

export async function updateMaintenanceWindow(
  context: MaintenanceWindowClientContext,
  params: UpdateMaintenanceWindowParams
): Promise<MaintenanceWindow> {
  return await retryIfConflicts(
    context.logger,
    `maintenanceWindowClient.update('${params.id})`,
    async () => {
      return await updateWithOCC(context, params);
    }
  );
}

async function updateWithOCC(
  context: MaintenanceWindowClientContext,
  params: UpdateMaintenanceWindowParams
): Promise<MaintenanceWindow> {
  const { savedObjectsClient, getModificationMetadata, logger, uiSettings } = context;
  const { id, data } = params;
  const { title, enabled, duration, rRule, schedule, scope, categoryIds } = data;
  const esQueryConfig = await getEsQueryConfig(uiSettings);

  try {
    updateMaintenanceWindowParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Error validating update maintenance window data - ${error.message}`);
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
      `Error validating update maintenance window data - ${getScopedQueryErrorMessage(
        error.message
      )}`
    );
  }

  try {
    const {
      attributes,
      id: fetchedId,
      version,
    } = await getMaintenanceWindowSo({ id, savedObjectsClient });

    const maintenanceWindow = transformMaintenanceWindowAttributesToMaintenanceWindow({
      attributes,
      id: fetchedId,
    });

    if (moment.utc(maintenanceWindow.expirationDate).isBefore(new Date())) {
      throw Boom.badRequest('Cannot edit archived maintenance windows');
    }

    const expirationDate: string = getMaintenanceWindowExpirationDate({
      schedule: schedule ? schedule.custom : maintenanceWindow.schedule.custom,
    });

    const modificationMetadata = await getModificationMetadata();

    let events = generateMaintenanceWindowEvents({
      schedule: schedule ? schedule.custom : maintenanceWindow.schedule.custom,
      expirationDate,
    });

    if (!shouldRegenerateEvents({ maintenanceWindow, schedule: schedule?.custom })) {
      events = mergeEvents({ oldEvents: maintenanceWindow.events, newEvents: events });
    }

    const updateMaintenanceWindowAttributes =
      transformMaintenanceWindowToMaintenanceWindowAttributes({
        ...maintenanceWindow,
        ...(title ? { title } : {}),
        ...(rRule ? { rRule: rRule as MaintenanceWindow['rRule'] } : {}),
        ...(categoryIds !== undefined ? { categoryIds } : {}),
        ...(scopedQueryWithGeneratedValue !== undefined
          ? { scopedQuery: scopedQueryWithGeneratedValue }
          : {}),
        ...(typeof duration === 'number' ? { duration } : {}),
        ...(typeof enabled === 'boolean' ? { enabled } : {}),
        expirationDate,
        events,
        updatedBy: modificationMetadata.updatedBy,
        updatedAt: modificationMetadata.updatedAt,
        ...(schedule ? { schedule } : {}),
        ...(scopedQueryWithGeneratedValue !== undefined
          ? { scope: { alerting: scopedQueryWithGeneratedValue } }
          : {}),
      });

    // We are deleting and then creating rather than updating because SO.update
    // performs a partial update on the rRule, we would need to null out all of the fields
    // that are removed from a new rRule if that were the case.
    const result = await createMaintenanceWindowSo({
      savedObjectsClient,
      maintenanceWindowAttributes: updateMaintenanceWindowAttributes,
      savedObjectsCreateOptions: {
        id: fetchedId,
        version,
        overwrite: true,
      },
    });

    return transformMaintenanceWindowAttributesToMaintenanceWindow({
      attributes: result.attributes,
      id: result.id,
    });
  } catch (e) {
    const errorMessage = `Failed to update maintenance window by id: ${id}, Error: ${e}`;
    logger.error(errorMessage);
    throw Boom.boomify(e, { message: errorMessage });
  }
}
