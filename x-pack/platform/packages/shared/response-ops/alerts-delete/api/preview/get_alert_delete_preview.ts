/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertDeletePreviewResponse } from '@kbn/alerting-plugin/common/routes/alert_delete';
import type { HttpStart } from '@kbn/core/public';
import type { AlertDeleteParams, AlertDeletePreview } from '@kbn/alerting-types/alert_delete_types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

export type GetAlertDeletePreviewResponse = AlertDeletePreview;

export interface GetAlertDeletePreviewParams {
  services: { http: HttpStart };
  requestQuery: AlertDeleteParams;
}
export const getAlertDeletePreview = async ({
  services: { http },
  requestQuery: { activeAlertDeleteThreshold, inactiveAlertDeleteThreshold, categoryIds },
}: GetAlertDeletePreviewParams): Promise<GetAlertDeletePreviewResponse> => {
  const { affected_alert_count: affectedAlertCount } = await http.get<AlertDeletePreviewResponse>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_alert_delete_preview`,
    {
      query: {
        active_alert_delete_threshold: activeAlertDeleteThreshold,
        inactive_alert_delete_threshold: inactiveAlertDeleteThreshold,
        category_ids: categoryIds,
      },
    }
  );

  return { affectedAlertCount };
};
