/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import { ALERT_ACTION_GROUP } from '@kbn/rule-data-utils';
import { Alert as LegacyAlert } from '../../alert';
import { isAlertImproving } from './is_alert_improving';
import { existingExpandedNewAlert, existingFlattenedNewAlert } from './test_fixtures';
import { ActionGroup } from '../../types';

const actionGroupsWithSeverity: Array<ActionGroup<string>> = [
  { id: 'info', name: 'Info', severity: { level: 0 } },
  { id: 'warning', name: 'Warning', severity: { level: 1 } },
  { id: 'error', name: 'Error', severity: { level: 2 } },
  { id: 'critical', name: 'Critical Error', severity: { level: 3 } },
];

const actionGroupsWithoutSeverity: Array<ActionGroup<string>> = [
  { id: 'info', name: 'Info' },
  { id: 'warning', name: 'Warning' },
  { id: 'error', name: 'Error' },
  { id: 'critical', name: 'Critical Error' },
];

type TestActionGroupIds = 'info' | 'error' | 'warning' | 'critical';

for (const flattened of [true, false]) {
  // existing alert action group = 'error'
  const existingAlert = flattened ? existingFlattenedNewAlert : existingExpandedNewAlert;

  describe(`isAlertImproving for ${flattened ? 'flattened' : 'expanded'} existing alert`, () => {
    test('should return null if no scheduled action group', () => {
      const legacyAlert = new LegacyAlert<{}, {}, TestActionGroupIds>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });

      expect(
        isAlertImproving<{}, {}, {}, TestActionGroupIds, 'recovered'>(
          // @ts-expect-error
          existingAlert,
          legacyAlert,
          actionGroupsWithSeverity
        )
      ).toEqual(null);
    });

    test('should return false if no previous action group', () => {
      // existing alert action group = 'error'
      const copyAlert = cloneDeep(existingAlert);
      const legacyAlert = new LegacyAlert<{}, {}, TestActionGroupIds>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert.scheduleActions('warning');

      set(copyAlert, ALERT_ACTION_GROUP, undefined);
      expect(
        isAlertImproving<{}, {}, {}, TestActionGroupIds, 'recovered'>(
          // @ts-expect-error
          copyAlert,
          legacyAlert,
          actionGroupsWithSeverity
        )
      ).toEqual(null);
    });

    test('should return false if no severity defined for action groups', () => {
      const legacyAlert = new LegacyAlert<{}, {}, TestActionGroupIds>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert.scheduleActions('warning');
      expect(
        isAlertImproving<{}, {}, {}, TestActionGroupIds, 'recovered'>(
          // @ts-expect-error
          existingAlert,
          legacyAlert,
          actionGroupsWithoutSeverity
        )
      ).toEqual(null);
    });

    test('should return null if severity stays the same', () => {
      const legacyAlert = new LegacyAlert<{}, {}, TestActionGroupIds>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert.scheduleActions('error');
      expect(
        isAlertImproving<{}, {}, {}, TestActionGroupIds, 'recovered'>(
          // @ts-expect-error
          existingAlert,
          legacyAlert,
          actionGroupsWithSeverity
        )
      ).toEqual(null);
    });

    test('should return false if severity degrades', () => {
      const legacyAlert = new LegacyAlert<{}, {}, TestActionGroupIds>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert.scheduleActions('critical');
      expect(
        isAlertImproving<{}, {}, {}, TestActionGroupIds, 'recovered'>(
          // @ts-expect-error
          existingAlert,
          legacyAlert,
          actionGroupsWithSeverity
        )
      ).toEqual(false);
    });

    test('should return true if severity improves', () => {
      const legacyAlert = new LegacyAlert<{}, {}, TestActionGroupIds>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert.scheduleActions('warning');
      expect(
        isAlertImproving<{}, {}, {}, TestActionGroupIds, 'recovered'>(
          // @ts-expect-error
          existingAlert,
          legacyAlert,
          actionGroupsWithSeverity
        )
      ).toEqual(true);
    });

    test('should return true if severity improves multiple levels', () => {
      const legacyAlert = new LegacyAlert<{}, {}, TestActionGroupIds>('alert-A', {
        meta: { uuid: 'abcdefg' },
      });
      legacyAlert.scheduleActions('info');
      expect(
        isAlertImproving<{}, {}, {}, TestActionGroupIds, 'recovered'>(
          // @ts-expect-error
          existingAlert,
          legacyAlert,
          actionGroupsWithSeverity
        )
      ).toEqual(true);
    });
  });
}
