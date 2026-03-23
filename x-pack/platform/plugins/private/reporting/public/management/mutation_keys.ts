/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mutationKeys = {
  root: 'reporting',
  scheduleReport: () => [mutationKeys.root, 'scheduleReport'] as const,
  updateScheduleReport: () => [mutationKeys.root, 'updateScheduleReport'] as const,
  bulkDisableScheduledReports: () => [mutationKeys.root, 'bulkDisableScheduledReports'] as const,
  bulkDeleteScheduledReports: () => [mutationKeys.root, 'bulkDeleteScheduledReports'] as const,
  bulkEnableScheduledReports: () => [mutationKeys.root, 'bulkEnableScheduledReports'] as const,
};
