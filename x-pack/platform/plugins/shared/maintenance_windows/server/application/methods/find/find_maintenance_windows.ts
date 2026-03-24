/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression } from '@kbn/es-query';
import type { MaintenanceWindowClientContext } from '../../../../common';
import { transformMaintenanceWindowAttributesToMaintenanceWindow } from '../../transforms';
import { findMaintenanceWindowSo } from '../../../data';
import type {
  FindMaintenanceWindowsResult,
  FindMaintenanceWindowsParams,
  MaintenanceWindowsStatus,
} from './types';
import { findMaintenanceWindowsParamsSchema } from './schemas';
import { getMaintenanceWindowStatus } from '../../lib/get_maintenance_window_status';

export const getStatusFilter = (
  status?: MaintenanceWindowsStatus[]
): KueryNode | string | undefined => {
  if (!status || status.length === 0) return undefined;
  const mwStatusQuery = getMaintenanceWindowStatus();

  const fullQuery = status
    .map((value) => mwStatusQuery[value])
    .filter(Boolean)
    .join(' or ');

  return fullQuery ? fromKueryExpression(fullQuery) : undefined;
};

export async function findMaintenanceWindows(
  context: MaintenanceWindowClientContext,
  params?: FindMaintenanceWindowsParams
): Promise<FindMaintenanceWindowsResult> {
  const { savedObjectsClient, logger } = context;

  try {
    if (params) {
      findMaintenanceWindowsParamsSchema.validate(params);
    }
  } catch (error) {
    throw Boom.badRequest(`Error validating find maintenance windows data - ${error.message}`);
  }

  const filter = getStatusFilter(params?.status);

  try {
    const result = await findMaintenanceWindowSo({
      savedObjectsClient,
      ...(params
        ? {
            savedObjectsFindOptions: {
              ...(params.search ? { search: params.search } : {}),
              ...(params.searchFields ? { searchFields: params.searchFields } : {}),
              ...(params.page ? { page: params.page } : {}),
              ...(params.perPage ? { perPage: params.perPage } : {}),
              ...(filter ? { filter } : {}),
              ...(params.namespaces ? { namespaces: params.namespaces } : {}),
            },
          }
        : {}),
    });

    return {
      page: result.page,
      perPage: result.per_page,
      total: result.total,
      data: result.saved_objects.map((so) =>
        transformMaintenanceWindowAttributesToMaintenanceWindow({
          attributes: so.attributes,
          id: so.id,
        })
      ),
    };
  } catch (e) {
    const errorMessage = `Failed to find maintenance window, Error: ${e}`;
    logger.error(errorMessage);
    throw Boom.boomify(e, { message: errorMessage });
  }
}
