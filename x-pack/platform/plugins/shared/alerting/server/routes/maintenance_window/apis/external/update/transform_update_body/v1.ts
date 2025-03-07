/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UpdateMaintenanceWindowRequestBodyV1 } from '../../../../../../../common/routes/maintenance_window/external/apis/update';
import { UpdateMaintenanceWindowParams } from '../../../../../../application/maintenance_window/methods/update/types';

/**
 *  This function converts from the external, human readable, Maintenance Window creation/POST
 *  type expected by the public APIs, to the internal type used by the client.
 */
export const transformUpdateBody = (
  updateBody: UpdateMaintenanceWindowRequestBodyV1
): UpdateMaintenanceWindowParams['data'] => {
  // TODO categoryIds
  // const kql = updateBody.scope?.query.kql;

  // TODO schedule schema
  // const customSchedule = updateBody.schedule?.custom;

  return {
    title: updateBody.title,
    enabled: updateBody.enabled,

    // TODO categoryIds
    // Updating the scope depends on the removal of categoryIds from the client
    // See: https://github.com/elastic/kibana/issues/197530
    // scopedQuery: kql ? { kql, filters: [] } : null,

    // TODO schedule schema
    // duration: customSchedule?.duration,
    // rRule: {
    //   dtstart: customSchedule?.start ?? '',
    //   tzid: 'UTC',
    // },
  };
};
