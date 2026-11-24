/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Alert } from '@kbn/alerts-as-data-utils';
import {
  ALERT_END,
  ALERT_START,
  ALERT_STATUS,
  ALERT_TIME_RANGE,
  ALERT_TRACKED,
} from '@kbn/rule-data-utils';
import { get, omit } from 'lodash';
import { buildUntrackedAlert } from './build_untracked_alert';
import { existingExpandedActiveAlert, existingFlattenedActiveAlert } from '../test_fixtures';

const timestamp = '2023-03-29T12:27:28.159Z';
const start = '2023-03-28T12:27:28.159Z';

describe('buildUntrackedAlert', () => {
  test('untracks a flattened active alert document and leaves every other field unchanged', () => {
    expect(
      buildUntrackedAlert<{}>({
        alert: { ...existingFlattenedActiveAlert, [ALERT_TRACKED]: true },
        timestamp,
      })
    ).toEqual({
      ...existingFlattenedActiveAlert,
      [ALERT_STATUS]: 'untracked',
      [ALERT_END]: timestamp,
      [ALERT_TIME_RANGE]: { gte: start, lte: timestamp },
      [ALERT_TRACKED]: false,
    });
  });

  test('untracks an alert document that was written before the tracked field existed', () => {
    const untrackedAlert = buildUntrackedAlert<{}>({
      alert: existingFlattenedActiveAlert,
      timestamp,
    });

    expect(untrackedAlert[ALERT_STATUS]).toEqual('untracked');
    expect(untrackedAlert[ALERT_TRACKED]).toEqual(false);
  });

  test('replaces the nested fields of an expanded alert document instead of duplicating them', () => {
    const untrackedAlert = buildUntrackedAlert<{}>({
      alert: existingExpandedActiveAlert as Alert,
      timestamp,
    });

    expect(untrackedAlert).toEqual(
      expect.objectContaining({
        [ALERT_STATUS]: 'untracked',
        [ALERT_END]: timestamp,
        [ALERT_TIME_RANGE]: { gte: start, lte: timestamp },
        [ALERT_TRACKED]: false,
      })
    );
    // the nested copies are gone, the other nested fields are kept
    expect(get(untrackedAlert, 'kibana.alert')).not.toHaveProperty('status');
    expect(get(untrackedAlert, 'kibana.alert')).not.toHaveProperty('time_range');
    expect(get(untrackedAlert, 'kibana.alert.start')).toEqual(start);
    expect(get(untrackedAlert, 'kibana.alert.instance.id')).toEqual('alert-A');
  });

  test('uses the alert start when the alert document has no time range', () => {
    const untrackedAlert = buildUntrackedAlert<{}>({
      alert: omit(existingFlattenedActiveAlert, ALERT_TIME_RANGE) as Alert,
      timestamp,
    });

    expect(untrackedAlert[ALERT_TIME_RANGE]).toEqual({ gte: start, lte: timestamp });
  });

  test('does not write a time range when the alert document has no start', () => {
    const untrackedAlert = buildUntrackedAlert<{}>({
      alert: omit(existingFlattenedActiveAlert, [ALERT_TIME_RANGE, ALERT_START]) as Alert,
      timestamp,
    });

    expect(untrackedAlert).not.toHaveProperty([ALERT_TIME_RANGE]);
    expect(untrackedAlert[ALERT_END]).toEqual(timestamp);
  });
});
