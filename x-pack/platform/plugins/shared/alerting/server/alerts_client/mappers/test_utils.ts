/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RecoveredActionGroup } from '@kbn/alerting-types';
import { schema } from '@kbn/config-schema';
import type { KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { Alert } from '../../alert/alert';
import { maintenanceWindowsServiceMock } from '../../task_runner/maintenance_windows/maintenance_windows_service.mock';
import { alertingEventLoggerMock } from '../../lib/alerting_event_logger/alerting_event_logger.mock';
import type { UntypedNormalizedRuleType } from '../../rule_type_registry';
import type { AlertInstanceState as State, AlertInstanceContext as Context } from '../../../types';

export const logger = loggingSystemMock.createLogger();
export const alertingEventLogger = alertingEventLoggerMock.create();
export const maintenanceWindowsService = maintenanceWindowsServiceMock.create();

export const fakeRequest = {
  headers: {},
  getBasePath: () => '',
  path: '/',
  route: { settings: {} },
  url: {
    href: '/',
  },
  raw: {
    req: {
      url: '/',
    },
  },
  getSavedObjectsClient: jest.fn(),
} as unknown as KibanaRequest;

export const ruleType: jest.Mocked<UntypedNormalizedRuleType> = {
  id: 'test',
  name: 'My test rule',
  actionGroups: [{ id: 'default', name: 'Default' }, RecoveredActionGroup],
  defaultActionGroupId: 'default',
  minimumLicenseRequired: 'basic',
  isExportable: true,
  recoveryActionGroup: RecoveredActionGroup,
  executor: jest.fn(),
  category: 'test',
  producer: 'alerts',
  solution: 'stack',
  cancelAlertsOnRuleTimeout: true,
  ruleTaskTimeout: '5m',
  validate: {
    params: schema.any(),
  },
  validLegacyConsumers: [],
};

export const alertsClientContext = {
  alertingEventLogger,
  logger,
  request: fakeRequest,
  spaceId: 'space1',
  ruleType,
  maintenanceWindowsService,
};

export function alertToJson<S extends State, C extends Context, G extends string>(
  alert: Alert<S, C, G>
) {
  const state = alert.getState();
  const { start, duration, end, ...restState } = state;
  return {
    id: alert.getId(),
    uuid: alert.getUuid(),
    state: { ...restState },
    start,
    duration,
    end,
    maintenanceWindowIds: alert.getMaintenanceWindowIds(),
    flapping: alert.getFlapping(),
    flappingHistory: alert.getFlappingHistory(),
    pendingRecoveredCount: alert.getPendingRecoveredCount(),
    activeCount: alert.getActiveCount(),
    lastScheduledActions: alert.getLastScheduledActions(),
  };
}
