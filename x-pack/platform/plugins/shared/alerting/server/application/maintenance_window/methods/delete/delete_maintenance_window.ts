/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { MaintenanceWindowClientContext } from '../../../../../common';
import type { DeleteMaintenanceWindowParams } from './types';
import { deleteMaintenanceWindowParamsSchema } from './schemas';
import { retryIfConflicts } from '../../../../lib/retry_if_conflicts';
import { deleteMaintenanceWindowSo } from '../../../../data/maintenance_window';

export async function deleteMaintenanceWindow(
  context: MaintenanceWindowClientContext,
  params: DeleteMaintenanceWindowParams
): Promise<{}> {
  return await retryIfConflicts(
    context.logger,
    `maintenanceWindowClient.delete('${params.id}')`,
    async () => await deleteWithOCC(context, params)
  );
}

async function deleteWithOCC(
  context: MaintenanceWindowClientContext,
  params: DeleteMaintenanceWindowParams
): Promise<{}> {
  const { savedObjectsClient, logger } = context;
  const { id } = params;

  try {
    deleteMaintenanceWindowParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Error validating delete maintenance window data - ${error.message}`);
  }

  try {
    return await deleteMaintenanceWindowSo({ id, savedObjectsClient });
  } catch (e) {
    const errorMessage = `Failed to delete maintenance window by id: ${id}, Error: ${e}`;
    logger.error(errorMessage);
    throw Boom.boomify(e, { message: errorMessage });
  }
}
