/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesSettingsAlertDeleteProperties } from '@kbn/alerting-types';
import {
  alertDeleteCategoryIds,
  type AlertDeleteCategoryIds,
} from '../../../../../common/constants/alert_delete';
import type {
  AlertDeletePreviewQueryV1,
  AlertDeleteScheduleQueryV1,
} from '../../../../../common/routes/alert_delete';

const getCategoryIds = (input: AlertDeleteCategoryIds | AlertDeleteCategoryIds[] | undefined) => {
  if (!input)
    return [
      alertDeleteCategoryIds.MANAGEMENT,
      alertDeleteCategoryIds.SECURITY_SOLUTION,
      alertDeleteCategoryIds.OBSERVABILITY,
    ];

  // Accepting single category id or array of category ids because
  // sending an array with just one element is decoded as a simple string
  return Array.isArray(input) ? input : [input];
};

const getSpaceIds = (input: string | string[] | undefined): string[] => {
  if (!input) return ['default'];
  if (Array.isArray(input)) return input;
  return [input];
};

export const transformRequestToAlertDeletePreview = ({
  active_alert_delete_threshold: activeAlertDeleteThreshold,
  inactive_alert_delete_threshold: inactiveAlertDeleteThreshold,
  category_ids: _categoryIds,
}: AlertDeletePreviewQueryV1): RulesSettingsAlertDeleteProperties => {
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
}: AlertDeleteScheduleQueryV1): RulesSettingsAlertDeleteProperties & { spaceIds: string[] } => {
  return {
    isActiveAlertDeleteEnabled: Boolean(activeAlertDeleteThreshold),
    isInactiveAlertDeleteEnabled: Boolean(inactiveAlertDeleteThreshold),
    activeAlertDeleteThreshold: activeAlertDeleteThreshold || 1,
    inactiveAlertDeleteThreshold: inactiveAlertDeleteThreshold || 1,
    categoryIds: getCategoryIds(categoryIds),
    spaceIds: getSpaceIds(spaceIds),
  };
};
