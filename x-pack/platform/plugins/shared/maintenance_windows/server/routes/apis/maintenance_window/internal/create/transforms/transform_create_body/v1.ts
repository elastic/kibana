/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateMaintenanceWindowRequestBodyV1 } from '../../../../../../schemas/maintenance_window/internal/request/create';
import type { CreateMaintenanceWindowParams } from '../../../../../../../application/methods/create/types';
import { transformRRuleToCustomSchedule } from '../../../../../../../lib/transforms/rrule_to_custom/latest';

export const transformCreateBody = (
  createBody: CreateMaintenanceWindowRequestBodyV1
): CreateMaintenanceWindowParams['data'] => {
  const schedule = transformRRuleToCustomSchedule({
    rRule: createBody.r_rule,
    duration: createBody.duration,
  });
  const scope =
    createBody.scoped_query || createBody.scope_episode_query
      ? {
          ...(createBody.scoped_query ? { alerting: createBody.scoped_query } : {}),
          ...(createBody.scope_episode_query ? { episodes: createBody.scope_episode_query } : {}),
        }
      : undefined;

  return {
    title: createBody.title,
    duration: createBody.duration,
    rRule: createBody.r_rule,
    categoryIds: createBody.category_ids,
    scopedQuery: createBody.scoped_query,
    schedule: { custom: schedule },
    ...(scope ? { scope } : {}),
  };
};
