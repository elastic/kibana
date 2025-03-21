/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesSettingsAlertDeletion } from '@kbn/alerting-types';
import type { AlertDeletionSettingsResponseV1 } from '../../../../../common/routes/rules_settings/response';

export const transformAlertDeletionSettingsToResponse = (
  settings: RulesSettingsAlertDeletion
): AlertDeletionSettingsResponseV1 => {
  return {
    body: {
      active_alerts_deletion_threshold: settings.activeAlertsDeletionThreshold,
      is_active_alerts_deletion_enabled: settings.isActiveAlertsDeletionEnabled,
      inactive_alerts_deletion_threshold: settings.inactiveAlertsDeletionThreshold,
      is_inactive_alerts_deletion_enabled: settings.isInactiveAlertsDeletionEnabled,
      ...(settings.categoryIds ? { category_ids: settings.categoryIds } : {}),
      created_at: settings.createdAt,
      created_by: settings.createdBy,
      updated_at: settings.updatedAt,
      updated_by: settings.updatedBy,
    },
  };
};
