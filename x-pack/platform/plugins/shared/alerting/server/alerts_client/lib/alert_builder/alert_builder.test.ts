/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { schema } from '@kbn/config-schema';
import { ALERT_INSTANCE_ID, ALERT_UUID } from '@kbn/rule-data-utils';
import { AlertBuilder } from './alert_builder';
import { legacyAlertsClientMock } from '../../legacy_alerts_client.mock';
import { createEmptyTrackedAlerts } from '../get_tracked_alerts';
import { alertRule, rule } from '../test_fixtures';
import type { UntypedNormalizedRuleType } from '../../../rule_type_registry';
import { RecoveredActionGroup } from '../../../types';
import type { IIndexPatternString } from '../../../alerts_service/resource_installer_utils';
import type { AlertRuleData } from '../../types';

const logger = loggingSystemMock.create().get();
const ruleInfoMessage = "for test.rule-type:1 'rule-name'";
const logTags = { tags: ['test.rule-type', '1', 'alerts-client'] };

const ruleType = {
  id: 'test.rule-type',
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
  validate: { params: schema.any() },
  validLegacyConsumers: [],
} as unknown as UntypedNormalizedRuleType;

const alertRuleData: AlertRuleData = {
  consumer: rule.consumer,
  executionId: rule.execution.uuid,
  id: rule.uuid,
  name: rule.name,
  parameters: rule.parameters,
  revision: rule.revision,
  spaceId: 'default',
  tags: rule.tags,
  alertDelay: 0,
  muteAll: false,
  mutedInstanceIds: [],
};

const indexTemplateAndPattern: IIndexPatternString = {
  template: 'test-template',
  pattern: 'test-pattern*',
  alias: 'test-alias',
  name: 'test-name',
  basePattern: 'test-base',
};

const buildAlertBuilder = ({ trackedAlerts = createEmptyTrackedAlerts() } = {}) => {
  const legacyAlertsClient = legacyAlertsClientMock.create();
  legacyAlertsClient.getProcessedAlerts.mockImplementation(() => ({}));

  const alertBuilder = new AlertBuilder({
    rule: alertRule,
    reportedAlerts: {},
    legacyAlertsClient,
    currentTime: '2023-03-28T12:30:28.159Z',
    logger,
    trackedAlerts,
    ruleType,
    alertRuleData,
    kibanaVersion: '8.8.1',
    indexTemplateAndPattern,
    ruleInfoMessage,
    logTags,
    isUsingDataStreams: false,
  });

  return { alertBuilder, legacyAlertsClient };
};

describe('AlertBuilder buildRecoveredAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('drops the recovery and logs an error when no tracked document matches the recovered instance', () => {
    const { alertBuilder, legacyAlertsClient } = buildAlertBuilder();

    legacyAlertsClient.getRawAlertInstancesForState.mockReturnValue({
      rawActiveAlerts: {},
      rawRecoveredAlerts: {
        'alert-orphan': { meta: { uuid: 'uuid-orphan' } },
      },
    });

    const alertsToIndex = alertBuilder.buildAlerts();

    expect(alertsToIndex).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('uuid-orphan'), logTags);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Recovery was not written'),
      logTags
    );
  });

  it('builds the recovered alert normally when a tracked document exists', () => {
    const trackedAlerts = createEmptyTrackedAlerts();
    const trackedDoc = { [ALERT_UUID]: 'uuid-1', [ALERT_INSTANCE_ID]: 'alert-1' };
    trackedAlerts.all['uuid-1'] = trackedDoc as never;
    trackedAlerts.active['uuid-1'] = trackedDoc as never;

    const { alertBuilder, legacyAlertsClient } = buildAlertBuilder({ trackedAlerts });

    legacyAlertsClient.getRawAlertInstancesForState.mockReturnValue({
      rawActiveAlerts: {},
      rawRecoveredAlerts: {
        'alert-1': { meta: { uuid: 'uuid-1' } },
      },
    });

    const alertsToIndex = alertBuilder.buildAlerts();

    expect(alertsToIndex).toHaveLength(1);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
