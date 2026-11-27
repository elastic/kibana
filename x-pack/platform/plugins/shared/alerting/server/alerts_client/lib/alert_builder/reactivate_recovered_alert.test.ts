/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { Alert } from '@kbn/alerts-as-data-utils';
import {
  ALERT_ACTION_GROUP,
  ALERT_END,
  ALERT_PREVIOUS_ACTION_GROUP,
  ALERT_START,
  ALERT_STATUS,
  ALERT_TIME_RANGE,
  ALERT_WORKFLOW_STATUS,
} from '@kbn/rule-data-utils';
import { expandFlattenedAlert } from '../format_alert';
import { existingFlattenedRecoveredAlert } from '../test_fixtures';
import { reactivateRecoveredAlert } from './reactivate_recovered_alert';

const recoveredAlert = {
  ...existingFlattenedRecoveredAlert,
  [ALERT_PREVIOUS_ACTION_GROUP]: 'error',
  [ALERT_WORKFLOW_STATUS]: 'acknowledged',
};

const replacedFields = [ALERT_STATUS, ALERT_ACTION_GROUP, ALERT_END, ALERT_TIME_RANGE];

describe('reactivateRecoveredAlert', () => {
  test('should restore the status, action group and time range the alert had before it recovered', () => {
    expect(reactivateRecoveredAlert(recoveredAlert)).toEqual({
      ...omit(recoveredAlert, replacedFields),
      [ALERT_STATUS]: 'active',
      [ALERT_ACTION_GROUP]: 'error',
      [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z' },
    });
  });

  test('should replace the fields of an unflattened document', () => {
    expect(reactivateRecoveredAlert(expandFlattenedAlert(recoveredAlert) as Alert)).toEqual({
      ...expandFlattenedAlert(omit(recoveredAlert, replacedFields)),
      [ALERT_STATUS]: 'active',
      [ALERT_ACTION_GROUP]: 'error',
      [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z' },
    });
  });

  test('should not set a time range when the document has no start', () => {
    expect(reactivateRecoveredAlert(omit(recoveredAlert, ALERT_START))).toEqual({
      ...omit(recoveredAlert, [ALERT_START, ...replacedFields]),
      [ALERT_STATUS]: 'active',
      [ALERT_ACTION_GROUP]: 'error',
    });
  });
});
