/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesSettingsAlertDeletionProperties } from '@kbn/alerting-types';
import type { AlertDeletionPreviewQueryV1 } from '../../../../../common/routes/rule/apis/alert_deletion';

export const transformRequestToAlertDeletionPreview = ({
  is_active_alerts_deletion_enabled: isActiveAlertsDeletionEnabled,
  is_inactive_alerts_deletion_enabled: isInactiveAlertsDeletionEnabled,
  active_alerts_deletion_threshold: activeAlertsDeletionThreshold,
  inactive_alerts_deletion_threshold: inactiveAlertsDeletionThreshold,
  category_ids: categoryIds,
}: AlertDeletionPreviewQueryV1): RulesSettingsAlertDeletionProperties => {
  return {
    isActiveAlertsDeletionEnabled,
    isInactiveAlertsDeletionEnabled,
    activeAlertsDeletionThreshold,
    inactiveAlertsDeletionThreshold,
    categoryIds,
  };
};
