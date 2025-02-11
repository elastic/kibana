/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const triggersActionsUiQueriesKeys = {
  all: ['triggersActionsUi'] as const,
  alertsTable: () => [...triggersActionsUiQueriesKeys.all, 'alertsTable'] as const,
  cases: () => [...triggersActionsUiQueriesKeys.alertsTable(), 'cases'] as const,
  mutedAlerts: () => [...triggersActionsUiQueriesKeys.alertsTable(), 'mutedAlerts'] as const,
  casesBulkGet: (caseIds: string[]) =>
    [...triggersActionsUiQueriesKeys.cases(), 'bulkGet', caseIds] as const,
  maintenanceWindows: () =>
    [...triggersActionsUiQueriesKeys.alertsTable(), 'maintenanceWindows'] as const,
  maintenanceWindowsBulkGet: (maintenanceWindowIds: string[]) =>
    [
      ...triggersActionsUiQueriesKeys.maintenanceWindows(),
      'bulkGet',
      maintenanceWindowIds,
    ] as const,
};
