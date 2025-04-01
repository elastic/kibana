/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesSettingsAlertDeletionProperties } from '@kbn/alerting-types';
import type { AlertDeletePreviewQueryV1 } from '../../../../../common/routes/rules_settings/apis/alert_delete';

export const transformRequestToAlertDeletePreview = ({
  is_active_alert_delete_enabled: isActiveAlertDeleteEnabled,
  is_inactive_alert_delete_enabled: isInactiveAlertDeleteEnabled,
  active_alert_delete_threshold: activeAlertDeleteThreshold,
  inactive_alert_delete_threshold: inactiveAlertDeleteThreshold,
  category_ids: categoryIds,
}: AlertDeletePreviewQueryV1): RulesSettingsAlertDeletionProperties => {
  return {
    isActiveAlertDeleteEnabled,
    isInactiveAlertDeleteEnabled,
    activeAlertDeleteThreshold,
    inactiveAlertDeleteThreshold,
    categoryIds,
  };
};
