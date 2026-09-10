/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { AlertDeleteParams } from '@kbn/alerting-types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

export interface CreateAlertDeleteScheduleParams {
  services: { http: HttpStart };
  requestBody: AlertDeleteParams;
}
export const createAlertDeleteSchedule = async ({
  services: { http },
  requestBody: { activeAlertDeleteThreshold, inactiveAlertDeleteThreshold, categoryIds },
}: CreateAlertDeleteScheduleParams): Promise<string | undefined> => {
  return http.post(`${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_alert_delete_schedule`, {
    body: JSON.stringify({
      active_alert_delete_threshold: activeAlertDeleteThreshold,
      inactive_alert_delete_threshold: inactiveAlertDeleteThreshold,
      category_ids: categoryIds,
    }),
  });
};
