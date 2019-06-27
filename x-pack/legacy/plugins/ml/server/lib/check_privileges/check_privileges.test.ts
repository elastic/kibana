/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestProvider } from './__mocks__/call_with_request';
import { privilegesProvider } from './check_privileges';
import { mlPrivileges } from './privileges';

const xpackMainPluginWithSecurity = {
  info: {
    isAvailable: () => true,
    feature: () => ({
      isEnabled: () => true,
    }),
  },
};

const xpackMainPluginWithOutSecurity = {
  info: {
    isAvailable: () => true,
    feature: () => ({
      isEnabled: () => false,
    }),
  },
};

describe('check_privileges', () => {
  describe('getPrivileges() - right number of privileges', () => {
    test('es privileges count', async done => {
      const count = mlPrivileges.cluster.length;
      expect(count).toBe(35);
      done();
    });

    test('kibana privileges count', async done => {
      const callWithRequest = callWithRequestProvider('partialPrivileges');
      const { getPrivileges } = privilegesProvider(callWithRequest, xpackMainPluginWithSecurity);
      const { privileges } = await getPrivileges();
      const count = Object.keys(privileges).length;
      expect(count).toBe(23);
      done();
    });
  });

  describe('getPrivileges() with security', () => {
    test('ml_user privileges only', async done => {
      const callWithRequest = callWithRequestProvider('partialPrivileges');
      const { getPrivileges } = privilegesProvider(callWithRequest, xpackMainPluginWithSecurity);
      const { privileges, upgradeInProgress } = await getPrivileges();
      expect(upgradeInProgress).toBe(false);
      expect(privileges.canGetJobs).toBe(true);
      expect(privileges.canCreateJob).toBe(false);
      expect(privileges.canDeleteJob).toBe(false);
      expect(privileges.canOpenJob).toBe(false);
      expect(privileges.canCloseJob).toBe(false);
      expect(privileges.canForecastJob).toBe(false);
      expect(privileges.canGetDatafeeds).toBe(true);
      expect(privileges.canStartStopDatafeed).toBe(false);
      expect(privileges.canUpdateJob).toBe(false);
      expect(privileges.canUpdateDatafeed).toBe(false);
      expect(privileges.canPreviewDatafeed).toBe(false);
      expect(privileges.canGetCalendars).toBe(true);
      expect(privileges.canCreateCalendar).toBe(false);
      expect(privileges.canDeleteCalendar).toBe(false);
      expect(privileges.canGetFilters).toBe(false);
      expect(privileges.canCreateFilter).toBe(false);
      expect(privileges.canDeleteFilter).toBe(false);
      expect(privileges.canFindFileStructure).toBe(true);
      expect(privileges.canGetDataFrameJobs).toBe(false);
      expect(privileges.canDeleteDataFrameJob).toBe(false);
      expect(privileges.canPreviewDataFrameJob).toBe(false);
      expect(privileges.canCreateDataFrameJob).toBe(false);
      expect(privileges.canStartStopDataFrameJob).toBe(false);
      done();
    });

    test('full privileges', async done => {
      const callWithRequest = callWithRequestProvider('fullPrivileges');
      const { getPrivileges } = privilegesProvider(callWithRequest, xpackMainPluginWithSecurity);
      const { privileges, upgradeInProgress } = await getPrivileges();
      expect(upgradeInProgress).toBe(false);
      expect(privileges.canGetJobs).toBe(true);
      expect(privileges.canCreateJob).toBe(true);
      expect(privileges.canDeleteJob).toBe(true);
      expect(privileges.canOpenJob).toBe(true);
      expect(privileges.canCloseJob).toBe(true);
      expect(privileges.canForecastJob).toBe(true);
      expect(privileges.canGetDatafeeds).toBe(true);
      expect(privileges.canStartStopDatafeed).toBe(true);
      expect(privileges.canUpdateJob).toBe(true);
      expect(privileges.canUpdateDatafeed).toBe(true);
      expect(privileges.canPreviewDatafeed).toBe(true);
      expect(privileges.canGetCalendars).toBe(true);
      expect(privileges.canCreateCalendar).toBe(true);
      expect(privileges.canDeleteCalendar).toBe(true);
      expect(privileges.canGetFilters).toBe(true);
      expect(privileges.canCreateFilter).toBe(true);
      expect(privileges.canDeleteFilter).toBe(true);
      expect(privileges.canFindFileStructure).toBe(true);
      expect(privileges.canGetDataFrameJobs).toBe(true);
      expect(privileges.canDeleteDataFrameJob).toBe(true);
      expect(privileges.canPreviewDataFrameJob).toBe(true);
      expect(privileges.canCreateDataFrameJob).toBe(true);
      expect(privileges.canStartStopDataFrameJob).toBe(true);
      done();
    });

    test('upgrade in progress with full privileges', async done => {
      const callWithRequest = callWithRequestProvider('upgradeWithFullPrivileges');
      const { getPrivileges } = privilegesProvider(callWithRequest, xpackMainPluginWithSecurity);
      const { privileges, upgradeInProgress } = await getPrivileges();
      expect(upgradeInProgress).toBe(true);
      expect(privileges.canGetJobs).toBe(true);
      expect(privileges.canCreateJob).toBe(false);
      expect(privileges.canDeleteJob).toBe(false);
      expect(privileges.canOpenJob).toBe(false);
      expect(privileges.canCloseJob).toBe(false);
      expect(privileges.canForecastJob).toBe(false);
      expect(privileges.canGetDatafeeds).toBe(true);
      expect(privileges.canStartStopDatafeed).toBe(false);
      expect(privileges.canUpdateJob).toBe(false);
      expect(privileges.canUpdateDatafeed).toBe(false);
      expect(privileges.canPreviewDatafeed).toBe(false);
      expect(privileges.canGetCalendars).toBe(true);
      expect(privileges.canCreateCalendar).toBe(false);
      expect(privileges.canDeleteCalendar).toBe(false);
      expect(privileges.canGetFilters).toBe(true);
      expect(privileges.canCreateFilter).toBe(false);
      expect(privileges.canDeleteFilter).toBe(false);
      expect(privileges.canFindFileStructure).toBe(true);
      expect(privileges.canGetDataFrameJobs).toBe(true);
      expect(privileges.canDeleteDataFrameJob).toBe(false);
      expect(privileges.canPreviewDataFrameJob).toBe(false);
      expect(privileges.canCreateDataFrameJob).toBe(false);
      expect(privileges.canStartStopDataFrameJob).toBe(false);
      done();
    });

    test('upgrade in progress with partial privileges', async done => {
      const callWithRequest = callWithRequestProvider('upgradeWithPartialPrivileges');
      const { getPrivileges } = privilegesProvider(callWithRequest, xpackMainPluginWithSecurity);
      const { privileges, upgradeInProgress } = await getPrivileges();
      expect(upgradeInProgress).toBe(true);
      expect(privileges.canGetJobs).toBe(true);
      expect(privileges.canCreateJob).toBe(false);
      expect(privileges.canDeleteJob).toBe(false);
      expect(privileges.canOpenJob).toBe(false);
      expect(privileges.canCloseJob).toBe(false);
      expect(privileges.canForecastJob).toBe(false);
      expect(privileges.canGetDatafeeds).toBe(true);
      expect(privileges.canStartStopDatafeed).toBe(false);
      expect(privileges.canUpdateJob).toBe(false);
      expect(privileges.canUpdateDatafeed).toBe(false);
      expect(privileges.canPreviewDatafeed).toBe(false);
      expect(privileges.canGetCalendars).toBe(true);
      expect(privileges.canCreateCalendar).toBe(false);
      expect(privileges.canDeleteCalendar).toBe(false);
      expect(privileges.canGetFilters).toBe(false);
      expect(privileges.canCreateFilter).toBe(false);
      expect(privileges.canDeleteFilter).toBe(false);
      expect(privileges.canFindFileStructure).toBe(true);
      expect(privileges.canGetDataFrameJobs).toBe(false);
      expect(privileges.canDeleteDataFrameJob).toBe(false);
      expect(privileges.canPreviewDataFrameJob).toBe(false);
      expect(privileges.canCreateDataFrameJob).toBe(false);
      expect(privileges.canStartStopDataFrameJob).toBe(false);
      done();
    });
  });

  describe('getPrivileges() without security', () => {
    test('ml_user privileges only', async done => {
      const callWithRequest = callWithRequestProvider('partialPrivileges');
      const { getPrivileges } = privilegesProvider(callWithRequest, xpackMainPluginWithOutSecurity);
      const { privileges, upgradeInProgress } = await getPrivileges();
      expect(upgradeInProgress).toBe(false);
      expect(privileges.canGetJobs).toBe(true);
      expect(privileges.canCreateJob).toBe(true);
      expect(privileges.canDeleteJob).toBe(true);
      expect(privileges.canOpenJob).toBe(true);
      expect(privileges.canCloseJob).toBe(true);
      expect(privileges.canForecastJob).toBe(true);
      expect(privileges.canGetDatafeeds).toBe(true);
      expect(privileges.canStartStopDatafeed).toBe(true);
      expect(privileges.canUpdateJob).toBe(true);
      expect(privileges.canUpdateDatafeed).toBe(true);
      expect(privileges.canPreviewDatafeed).toBe(true);
      expect(privileges.canGetCalendars).toBe(true);
      expect(privileges.canCreateCalendar).toBe(true);
      expect(privileges.canDeleteCalendar).toBe(true);
      expect(privileges.canGetFilters).toBe(true);
      expect(privileges.canCreateFilter).toBe(true);
      expect(privileges.canDeleteFilter).toBe(true);
      expect(privileges.canFindFileStructure).toBe(true);
      expect(privileges.canGetDataFrameJobs).toBe(true);
      expect(privileges.canDeleteDataFrameJob).toBe(true);
      expect(privileges.canPreviewDataFrameJob).toBe(true);
      expect(privileges.canCreateDataFrameJob).toBe(true);
      expect(privileges.canStartStopDataFrameJob).toBe(true);
      done();
    });

    test('upgrade in progress with full privileges', async done => {
      const callWithRequest = callWithRequestProvider('upgradeWithFullPrivileges');
      const { getPrivileges } = privilegesProvider(callWithRequest, xpackMainPluginWithOutSecurity);
      const { privileges, upgradeInProgress } = await getPrivileges();
      expect(upgradeInProgress).toBe(true);
      expect(privileges.canGetJobs).toBe(true);
      expect(privileges.canCreateJob).toBe(false);
      expect(privileges.canDeleteJob).toBe(false);
      expect(privileges.canOpenJob).toBe(false);
      expect(privileges.canCloseJob).toBe(false);
      expect(privileges.canForecastJob).toBe(false);
      expect(privileges.canGetDatafeeds).toBe(true);
      expect(privileges.canStartStopDatafeed).toBe(false);
      expect(privileges.canUpdateJob).toBe(false);
      expect(privileges.canUpdateDatafeed).toBe(false);
      expect(privileges.canPreviewDatafeed).toBe(false);
      expect(privileges.canGetCalendars).toBe(true);
      expect(privileges.canCreateCalendar).toBe(false);
      expect(privileges.canDeleteCalendar).toBe(false);
      expect(privileges.canGetFilters).toBe(true);
      expect(privileges.canCreateFilter).toBe(false);
      expect(privileges.canDeleteFilter).toBe(false);
      expect(privileges.canFindFileStructure).toBe(true);
      expect(privileges.canGetDataFrameJobs).toBe(true);
      expect(privileges.canDeleteDataFrameJob).toBe(false);
      expect(privileges.canPreviewDataFrameJob).toBe(false);
      expect(privileges.canCreateDataFrameJob).toBe(false);
      expect(privileges.canStartStopDataFrameJob).toBe(false);
      done();
    });

    test('upgrade in progress with partial privileges', async done => {
      const callWithRequest = callWithRequestProvider('upgradeWithPartialPrivileges');
      const { getPrivileges } = privilegesProvider(callWithRequest, xpackMainPluginWithOutSecurity);
      const { privileges, upgradeInProgress } = await getPrivileges();
      expect(upgradeInProgress).toBe(true);
      expect(privileges.canGetJobs).toBe(true);
      expect(privileges.canCreateJob).toBe(false);
      expect(privileges.canDeleteJob).toBe(false);
      expect(privileges.canOpenJob).toBe(false);
      expect(privileges.canCloseJob).toBe(false);
      expect(privileges.canForecastJob).toBe(false);
      expect(privileges.canGetDatafeeds).toBe(true);
      expect(privileges.canStartStopDatafeed).toBe(false);
      expect(privileges.canUpdateJob).toBe(false);
      expect(privileges.canUpdateDatafeed).toBe(false);
      expect(privileges.canPreviewDatafeed).toBe(false);
      expect(privileges.canGetCalendars).toBe(true);
      expect(privileges.canCreateCalendar).toBe(false);
      expect(privileges.canDeleteCalendar).toBe(false);
      expect(privileges.canGetFilters).toBe(true);
      expect(privileges.canCreateFilter).toBe(false);
      expect(privileges.canDeleteFilter).toBe(false);
      expect(privileges.canFindFileStructure).toBe(true);
      expect(privileges.canGetDataFrameJobs).toBe(true);
      expect(privileges.canDeleteDataFrameJob).toBe(false);
      expect(privileges.canPreviewDataFrameJob).toBe(false);
      expect(privileges.canCreateDataFrameJob).toBe(false);
      expect(privileges.canStartStopDataFrameJob).toBe(false);
      done();
    });
  });
});
