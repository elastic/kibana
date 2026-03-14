/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateMaintenanceWindowRequestBodyV1 } from '../../../../../schemas/maintenance_window/external/request/create';
import type { CreateMaintenanceWindowParams } from '../../../../../../application/methods/create/types';

/**
 *  This function converts from the external, human readable, Maintenance Window creation/POST
 *  type expected by the public APIs, to the internal type used by the client.
 */
export const transformCreateBody = (
  createBody: CreateMaintenanceWindowRequestBodyV1
): CreateMaintenanceWindowParams['data'] => {
  const kql = createBody.scope?.alerting.query.kql;

  return {
    title: createBody.title,
    enabled: createBody.enabled,
    ...(kql && { scope: { alerting: { kql, filters: [] } } }),
    schedule: createBody.schedule,
  };
};
