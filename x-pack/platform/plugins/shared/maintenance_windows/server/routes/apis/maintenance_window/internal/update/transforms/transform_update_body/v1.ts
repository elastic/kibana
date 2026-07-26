/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformRRuleToCustomSchedule } from '../../../../../../../lib/transforms/rrule_to_custom/latest';
import type { UpdateMaintenanceWindowRequestBodyV1 } from '../../../../../../schemas/maintenance_window/internal/request/update';
import type { UpdateMaintenanceWindowParams } from '../../../../../../../application/methods/update/types';

export const transformUpdateBody = (
  updateBody: UpdateMaintenanceWindowRequestBodyV1
): UpdateMaintenanceWindowParams['data'] => {
  const {
    title,
    enabled,
    duration,
    r_rule: rRule,
    category_ids: categoryIds,
    scoped_query: scopedQuery,
  } = updateBody;

  const schedule =
    rRule && duration
      ? transformRRuleToCustomSchedule({
          rRule,
          duration,
        })
      : undefined;

  return {
    ...(title !== undefined ? { title } : {}),
    ...(enabled !== undefined ? { enabled } : {}),
    ...(duration !== undefined ? { duration } : {}),
    ...(rRule !== undefined ? { rRule } : {}),
    ...(categoryIds !== undefined ? { categoryIds } : {}),
    ...(scopedQuery !== undefined ? { scopedQuery } : {}),
    ...(schedule !== undefined ? { schedule: { custom: schedule } } : {}),
    ...(scopedQuery !== undefined ? { scope: { alerting: scopedQuery } } : {}),
  };
};
