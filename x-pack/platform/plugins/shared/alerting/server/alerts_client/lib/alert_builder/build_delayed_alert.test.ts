/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Alert as LegacyAlert } from '../../../alert/alert';
import {
  ALERT_ACTION_GROUP,
  ALERT_INSTANCE_ID,
  ALERT_STATUS,
  ALERT_UUID,
  TIMESTAMP,
  ALERT_CONSECUTIVE_MATCHES,
  ALERT_RULE_UUID,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_STATUS_DELAYED,
} from '@kbn/rule-data-utils';
import { alertRule } from '../test_fixtures';
import { buildDelayedAlert } from './build_delayed_alert';
import { get } from 'lodash';

describe('buildDelayedAlert', () => {
  test('should build alert document with info from legacy alert', () => {
    const legacyAlert = new LegacyAlert<{}, {}, 'default'>('alert-A');
    legacyAlert.scheduleActions('default');

    const timestamp = '2023-03-28T12:27:28.159Z';
    const alertInstanceId = legacyAlert.getId();

    expect(
      buildDelayedAlert<{}, {}, {}, 'default', 'recovered'>({
        legacyAlert,
        timestamp,
        rule: alertRule,
      })
    ).toEqual({
      [ALERT_UUID]: legacyAlert.getUuid(),
      [ALERT_RULE_UUID]: get(alertRule, ALERT_RULE_UUID),
      [ALERT_RULE_EXECUTION_UUID]: get(alertRule, ALERT_RULE_EXECUTION_UUID),
      [TIMESTAMP]: timestamp,
      [ALERT_ACTION_GROUP]: legacyAlert.getScheduledActionOptions()?.actionGroup,
      [ALERT_INSTANCE_ID]: alertInstanceId,
      [ALERT_CONSECUTIVE_MATCHES]: legacyAlert.getActiveCount(),
      [ALERT_STATUS]: ALERT_STATUS_DELAYED,
    });
  });
});
