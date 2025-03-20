/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RewriteRequestCase } from '@kbn/actions-types';
import type { RulesSettingsAlertDeletionProperties } from '@kbn/alerting-types';

export const transformAlertDeletionSettingsRequest: RewriteRequestCase<
  RulesSettingsAlertDeletionProperties
> = ({
  active_alerts_deletion_threshold: activeAlertsDeletionThreshold,
  is_active_alerts_deletion_enabled: isActiveAlertsDeletionEnabled,
  inactive_alerts_deletion_threshold: inactiveAlertsDeletionThreshold,
  is_inactive_alerts_deletion_enabled: isInactiveAlertsDeletionEnabled,
  category_ids: categoryIds,
}) => {
  return {
    activeAlertsDeletionThreshold,
    isActiveAlertsDeletionEnabled,
    inactiveAlertsDeletionThreshold,
    isInactiveAlertsDeletionEnabled,
    categoryIds,
  };
};
