/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesSettingsAlertDeleteProperties } from '@kbn/alerting-types';
import type {
  AlertDeletePreviewQuery,
  AlertDeleteScheduleQuery,
} from '../../../../../common/routes/alert_delete';
import { getCategoryIds } from './get_category_ids';
import { getSpaceIds } from './get_space_ids';

export const transformRequestToAlertDeletePreview = ({
  active_alert_delete_threshold: activeAlertDeleteThreshold,
  inactive_alert_delete_threshold: inactiveAlertDeleteThreshold,
  category_ids: _categoryIds,
}: AlertDeletePreviewQuery): RulesSettingsAlertDeleteProperties => {
  return {
    isActiveAlertDeleteEnabled: Boolean(activeAlertDeleteThreshold),
    isInactiveAlertDeleteEnabled: Boolean(inactiveAlertDeleteThreshold),
    activeAlertDeleteThreshold: activeAlertDeleteThreshold || 1,
    inactiveAlertDeleteThreshold: inactiveAlertDeleteThreshold || 1,
    categoryIds: getCategoryIds(_categoryIds),
  };
};

export const transformRequestToAlertDeleteSchedule = ({
  active_alert_delete_threshold: activeAlertDeleteThreshold,
  inactive_alert_delete_threshold: inactiveAlertDeleteThreshold,
  category_ids: categoryIds,
  space_ids: spaceIds,
}: AlertDeleteScheduleQuery): RulesSettingsAlertDeleteProperties => {
  return {
    isActiveAlertDeleteEnabled: Boolean(activeAlertDeleteThreshold),
    isInactiveAlertDeleteEnabled: Boolean(inactiveAlertDeleteThreshold),
    activeAlertDeleteThreshold: activeAlertDeleteThreshold || 1,
    inactiveAlertDeleteThreshold: inactiveAlertDeleteThreshold || 1,
    categoryIds: getCategoryIds(categoryIds),
    spaceIds: getSpaceIds(spaceIds),
  };
};
