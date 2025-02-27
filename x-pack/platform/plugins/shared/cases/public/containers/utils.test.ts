/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  valueToUpdateIsSettings,
  valueToUpdateIsStatus,
  createUpdateSuccessToaster,
  constructAssigneesFilter,
  constructReportersFilter,
  constructCustomFieldsFilter,
} from './utils';

import type { CaseUI } from './types';
import { CustomFieldTypes } from '../../common/types/domain';

const caseBeforeUpdate = {
  comments: [
    {
      type: 'alert',
    },
  ],
  settings: {
    syncAlerts: true,
  },
} as CaseUI;

const caseAfterUpdate = { title: 'My case' } as CaseUI;

describe('utils', () => {
  describe('valueToUpdateIsSettings', () => {
    it('returns true if key is settings', () => {
      expect(valueToUpdateIsSettings('settings', 'value')).toBe(true);
    });

    it('returns false if key is NOT settings', () => {
      expect(valueToUpdateIsSettings('tags', 'value')).toBe(false);
    });
  });

  describe('valueToUpdateIsStatus', () => {
    it('returns true if key is status', () => {
      expect(valueToUpdateIsStatus('status', 'value')).toBe(true);
    });

    it('returns false if key is NOT status', () => {
      expect(valueToUpdateIsStatus('tags', 'value')).toBe(false);
    });
  });

  describe('createUpdateSuccessToaster', () => {
    it('creates the correct toast when sync alerts is turned on and case has alerts', () => {
      // We remove the id as is randomly generated
      const toast = createUpdateSuccessToaster(caseBeforeUpdate, caseAfterUpdate, 'settings', {
        syncAlerts: true,
      });

      expect(toast).toEqual({
        title: 'Alerts in "My case" have been synced',
        className: 'eui-textBreakWord',
      });
    });

    it('creates the correct toast when sync alerts is turned on and case does NOT have alerts', () => {
      // We remove the id as is randomly generated
      const toast = createUpdateSuccessToaster(
        { ...caseBeforeUpdate, comments: [] },
        caseAfterUpdate,
        'settings',
        {
          syncAlerts: true,
        }
      );

      expect(toast).toEqual({
        title: 'Updated "My case"',
        className: 'eui-textBreakWord',
      });
    });

    it('creates the correct toast when sync alerts is turned off and case has alerts', () => {
      // We remove the id as is randomly generated
      const toast = createUpdateSuccessToaster(caseBeforeUpdate, caseAfterUpdate, 'settings', {
        syncAlerts: false,
      });

      expect(toast).toEqual({
        title: 'Updated "My case"',
        className: 'eui-textBreakWord',
      });
    });

    it('creates the correct toast when the status change, case has alerts, and sync alerts is on', () => {
      // We remove the id as is randomly generated
      const toast = createUpdateSuccessToaster(
        caseBeforeUpdate,
        caseAfterUpdate,
        'status',
        'closed'
      );

      expect(toast).toEqual({
        title: 'Updated "My case"',
        text: 'Updated the statuses of attached alerts.',
        className: 'eui-textBreakWord',
      });
    });

    it('creates the correct toast when the status change, case has alerts, and sync alerts is off', () => {
      // We remove the id as is randomly generated
      const toast = createUpdateSuccessToaster(
        { ...caseBeforeUpdate, settings: { syncAlerts: false } },
        caseAfterUpdate,
        'status',
        'closed'
      );

      expect(toast).toEqual({
        title: 'Updated "My case"',
        className: 'eui-textBreakWord',
      });
    });

    it('creates the correct toast when the status change, case does NOT have alerts, and sync alerts is on', () => {
      // We remove the id as is randomly generated
      const toast = createUpdateSuccessToaster(
        { ...caseBeforeUpdate, comments: [] },
        caseAfterUpdate,
        'status',
        'closed'
      );

      expect(toast).toEqual({
        title: 'Updated "My case"',
        className: 'eui-textBreakWord',
      });
    });

    it('creates the correct toast if not a status or a setting', () => {
      // We remove the id as is randomly generated
      const toast = createUpdateSuccessToaster(
        caseBeforeUpdate,
        caseAfterUpdate,
        'title',
        'My new title'
      );

      expect(toast).toEqual({
        title: 'Updated "My case"',
        className: 'eui-textBreakWord',
      });
    });
  });

  describe('constructAssigneesFilter', () => {
    it('returns an empty object if the array is empty', () => {
      expect(constructAssigneesFilter([])).toEqual({});
    });

    it('returns none for null values in the assignees array', () => {
      expect(constructAssigneesFilter([null, '123'])).toEqual({ assignees: ['none', '123'] });
    });
  });

  describe('constructReportersFilter', () => {
    it('returns an empty object if the array is empty', () => {
      expect(constructReportersFilter([])).toEqual({});
    });

    it('returns the reporters correctly', () => {
      expect(
        constructReportersFilter([
          { username: 'test', full_name: 'Test', email: 'elastic@elastic.co' },
          {
            username: 'test2',
            full_name: 'Test 2',
            email: 'elastic@elastic.co',
            profile_uid: '123',
          },
        ])
      ).toEqual({ reporters: ['test', '123'] });
    });
  });

  describe('constructCustomFieldsFilter', () => {
    it('returns an empty object if the customFields is empty', () => {
      expect(constructCustomFieldsFilter({})).toEqual({});
    });

    it('returns the customFields correctly', () => {
      expect(
        constructCustomFieldsFilter({
          '957846f4-a792-45a2-bc9a-c028973dfdde': {
            type: CustomFieldTypes.TOGGLE,
            options: ['on'],
          },
          'dbeb8e9c-240b-4adb-b83e-e645e86c07ed': {
            type: CustomFieldTypes.TOGGLE,
            options: ['off'],
          },
          'c1f0c0a0-2aaf-11ec-8d3d-0242ac130003': {
            type: CustomFieldTypes.TOGGLE,
            options: [],
          },
          'e0e8c50a-8d65-4f00-b6f0-d8a131fd34b4': {
            type: CustomFieldTypes.TOGGLE,
            options: ['on', 'off'],
          },
        })
      ).toEqual({
        customFields: {
          '957846f4-a792-45a2-bc9a-c028973dfdde': [true],
          'dbeb8e9c-240b-4adb-b83e-e645e86c07ed': [false],
          'e0e8c50a-8d65-4f00-b6f0-d8a131fd34b4': [true, false],
        },
      });
    });
  });
});
