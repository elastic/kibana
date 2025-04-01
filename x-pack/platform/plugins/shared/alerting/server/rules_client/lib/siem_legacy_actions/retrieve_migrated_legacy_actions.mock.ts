/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type {
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
  SavedObjectAttribute,
} from '@kbn/core/server';

import type { LegacyRuleNotificationAlertType } from './types';

export const migrateLegacyActionsMock = {
  legacyActions: [],
  legacyActionsReferences: [],
};

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetHourlyNotificationResult = (
  id = '456',
  ruleId = '123'
): LegacyRuleNotificationAlertType => ({
  id,
  name: 'Notification for Rule Test',
  tags: [],
  alertTypeId: 'siem.notifications',
  consumer: 'siem',
  params: {
    ruleAlertId: `${ruleId}`,
  },
  schedule: {
    interval: '1h',
  },
  enabled: true,
  actions: [
    {
      group: 'default',
      params: {
        message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
        to: ['test@test.com'],
        subject: 'Test Actions',
      },
      actionTypeId: '.email',
      id: '99403909-ca9b-49ba-9d7a-7e5320e68d05',
    },
  ],
  throttle: null,
  notifyWhen: 'onActiveAlert',
  apiKey: null,
  apiKeyOwner: 'elastic',
  createdBy: 'elastic',
  updatedBy: 'elastic',
  createdAt: new Date('2020-03-21T11:15:13.530Z'),
  muteAll: false,
  mutedInstanceIds: [],
  scheduledTaskId: '62b3a130-6b70-11ea-9ce9-6b9818c4cbd7',
  updatedAt: new Date('2020-03-21T12:37:08.730Z'),
  executionStatus: {
    status: 'unknown',
    lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
  },
  revision: 0,
});

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetWeeklyNotificationResult = (
  id = '456',
  ruleId = '123'
): LegacyRuleNotificationAlertType => ({
  id,
  name: 'Notification for Rule Test',
  tags: [],
  alertTypeId: 'siem.notifications',
  consumer: 'siem',
  params: {
    ruleAlertId: `${ruleId}`,
  },
  schedule: {
    interval: '7d',
  },
  enabled: true,
  actions: [
    {
      group: 'default',
      params: {
        message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
        to: ['test@test.com'],
        subject: 'Test Actions',
      },
      actionTypeId: '.email',
      id: '99403909-ca9b-49ba-9d7a-7e5320e68d05',
    },
  ],
  throttle: null,
  notifyWhen: 'onActiveAlert',
  apiKey: null,
  apiKeyOwner: 'elastic',
  createdBy: 'elastic',
  updatedBy: 'elastic',
  createdAt: new Date('2020-03-21T11:15:13.530Z'),
  muteAll: false,
  mutedInstanceIds: [],
  scheduledTaskId: '62b3a130-6b70-11ea-9ce9-6b9818c4cbd7',
  updatedAt: new Date('2020-03-21T12:37:08.730Z'),
  executionStatus: {
    status: 'unknown',
    lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
  },
  revision: 0,
});

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetDailyNotificationResult = (
  id = '456',
  ruleId = '123'
): LegacyRuleNotificationAlertType => ({
  id,
  name: 'Notification for Rule Test',
  tags: [],
  alertTypeId: 'siem.notifications',
  consumer: 'siem',
  params: {
    ruleAlertId: `${ruleId}`,
  },
  schedule: {
    interval: '1d',
  },
  enabled: true,
  actions: [
    {
      group: 'default',
      params: {
        message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
        to: ['test@test.com'],
        subject: 'Test Actions',
      },
      actionTypeId: '.email',
      id: '99403909-ca9b-49ba-9d7a-7e5320e68d05',
    },
  ],
  throttle: null,
  notifyWhen: 'onActiveAlert',
  apiKey: null,
  apiKeyOwner: 'elastic',
  createdBy: 'elastic',
  updatedBy: 'elastic',
  createdAt: new Date('2020-03-21T11:15:13.530Z'),
  muteAll: false,
  mutedInstanceIds: [],
  scheduledTaskId: '62b3a130-6b70-11ea-9ce9-6b9818c4cbd7',
  updatedAt: new Date('2020-03-21T12:37:08.730Z'),
  executionStatus: {
    status: 'unknown',
    lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
  },
  revision: 0,
});

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetSiemNotificationRuleNoActionsSOResult = (
  ruleId = '123'
): SavedObjectsFindResult<SavedObjectAttribute> => ({
  type: 'siem-detection-engine-rule-actions',
  id: 'ID_OF_LEGACY_SIDECAR_NO_ACTIONS',
  namespaces: ['default'],
  attributes: {
    actions: [],
    ruleThrottle: 'no_actions',
    alertThrottle: null,
  },
  references: [{ id: ruleId, type: RULE_SAVED_OBJECT_TYPE, name: 'alert_0' }],
  migrationVersion: {
    'siem-detection-engine-rule-actions': '7.11.2',
  },
  coreMigrationVersion: '7.15.2',
  updated_at: '2022-03-31T19:06:40.473Z',
  version: 'WzIzNywxXQ==',
  score: 0,
});

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetSiemNotificationRuleEveryRunSOResult = (
  ruleId = '123'
): SavedObjectsFindResult<SavedObjectAttribute> => ({
  type: 'siem-detection-engine-rule-actions',
  id: 'ID_OF_LEGACY_SIDECAR_RULE_RUN_ACTIONS',
  namespaces: ['default'],
  attributes: {
    actions: [
      {
        group: 'default',
        actionRef: 'action_0',
        params: {
          message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
          to: ['test@test.com'],
          subject: 'Test Actions',
        },
        action_type_id: '.email',
      },
    ],
    ruleThrottle: 'rule',
    alertThrottle: null,
  },
  references: [{ id: ruleId, type: RULE_SAVED_OBJECT_TYPE, name: 'alert_0' }],
  migrationVersion: {
    'siem-detection-engine-rule-actions': '7.11.2',
  },
  coreMigrationVersion: '7.15.2',
  updated_at: '2022-03-31T19:06:40.473Z',
  version: 'WzIzNywxXQ==',
  score: 0,
});

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetSiemNotificationRuleHourlyActionsSOResult = (
  ruleId = '123',
  connectorId = '456'
): SavedObjectsFindResult<SavedObjectAttribute> => ({
  type: 'siem-detection-engine-rule-actions',
  id: 'ID_OF_LEGACY_SIDECAR_HOURLY_ACTIONS',
  namespaces: ['default'],
  attributes: {
    actions: [
      {
        group: 'default',
        actionRef: 'action_0',
        params: {
          message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
          to: ['test@test.com'],
          subject: 'Test Actions',
        },
        action_type_id: '.email',
      },
    ],
    ruleThrottle: '1h',
    alertThrottle: '1h',
  },
  references: [
    { id: ruleId, type: RULE_SAVED_OBJECT_TYPE, name: 'alert_0' },
    { id: connectorId, type: 'action', name: 'action_0' },
  ],
  migrationVersion: {
    'siem-detection-engine-rule-actions': '7.11.2',
  },
  coreMigrationVersion: '7.15.2',
  updated_at: '2022-03-31T19:06:40.473Z',
  version: 'WzIzNywxXQ==',
  score: 0,
});

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetSiemNotificationRuleDailyActionsSOResult = (
  ruleId = '123',
  connectorId = '456'
): SavedObjectsFindResult<SavedObjectAttribute> => ({
  type: 'siem-detection-engine-rule-actions',
  id: 'ID_OF_LEGACY_SIDECAR_DAILY_ACTIONS',
  namespaces: ['default'],
  attributes: {
    actions: [
      {
        group: 'default',
        actionRef: 'action_0',
        params: {
          message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
          to: ['test@test.com'],
          subject: 'Test Actions',
        },
        action_type_id: '.email',
      },
    ],
    ruleThrottle: '1d',
    alertThrottle: '1d',
  },
  references: [
    { id: ruleId, type: RULE_SAVED_OBJECT_TYPE, name: 'alert_0' },
    { id: connectorId, type: 'action', name: 'action_0' },
  ],
  migrationVersion: {
    'siem-detection-engine-rule-actions': '7.11.2',
  },
  coreMigrationVersion: '7.15.2',
  updated_at: '2022-03-31T19:06:40.473Z',
  version: 'WzIzNywxXQ==',
  score: 0,
});

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetSiemNotificationRuleWeeklyActionsSOResult = (
  ruleId = '123',
  connectorId = '456'
): SavedObjectsFindResult<SavedObjectAttribute> => ({
  type: 'siem-detection-engine-rule-actions',
  id: 'ID_OF_LEGACY_SIDECAR_WEEKLY_ACTIONS',
  namespaces: ['default'],
  attributes: {
    actions: [
      {
        group: 'default',
        actionRef: 'action_0',
        params: {
          message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
          to: ['test@test.com'],
          subject: 'Test Actions',
        },
        action_type_id: '.email',
      },
    ],
    ruleThrottle: '7d',
    alertThrottle: '7d',
  },
  references: [
    { id: ruleId, type: RULE_SAVED_OBJECT_TYPE, name: 'alert_0' },
    { id: connectorId, type: 'action', name: 'action_0' },
  ],
  migrationVersion: {
    'siem-detection-engine-rule-actions': '7.11.2',
  },
  coreMigrationVersion: '7.15.2',
  updated_at: '2022-03-31T19:06:40.473Z',
  version: 'WzIzNywxXQ==',
  score: 0,
});

const getLegacyActionSOs = (ruleId = '123', connectorId = '456') => ({
  none: () => legacyGetSiemNotificationRuleNoActionsSOResult(ruleId),
  rule: () => legacyGetSiemNotificationRuleEveryRunSOResult(ruleId),
  hourly: () => legacyGetSiemNotificationRuleHourlyActionsSOResult(ruleId, connectorId),
  daily: () => legacyGetSiemNotificationRuleDailyActionsSOResult(ruleId, connectorId),
  weekly: () => legacyGetSiemNotificationRuleWeeklyActionsSOResult(ruleId, connectorId),
});

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const legacyGetSiemNotificationRuleActionsSOResultWithSingleHit = (
  actionTypes: Array<'none' | 'rule' | 'daily' | 'hourly' | 'weekly'>,
  ruleId = '123',
  connectorId = '456'
): SavedObjectsFindResponse<SavedObjectAttribute> => {
  const actions = getLegacyActionSOs(ruleId, connectorId);

  return {
    page: 1,
    per_page: 1,
    total: 1,
    saved_objects: actionTypes.map((type) => actions[type]()),
  };
};
