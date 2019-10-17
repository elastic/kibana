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
    feature: (f: string) => {
      switch (f) {
        case 'ml':
          return { isEnabled: () => true };
        case 'security':
          return { isEnabled: () => true };
      }
    },
    license: {
      isOneOf: () => true,
      isActive: () => true,
      getType: () => 'platinum',
    },
  },
} as any;

const xpackMainPluginWithOutSecurity = {
  info: {
    isAvailable: () => true,
    feature: (f: string) => {
      switch (f) {
        case 'ml':
          return { isEnabled: () => true };
        case 'security':
          return { isEnabled: () => false };
      }
    },
    license: {
      isOneOf: () => true,
      isActive: () => true,
      getType: () => 'platinum',
    },
  },
} as any;

const xpackMainPluginWithOutSecurityBasicLicense = {
  info: {
    isAvailable: () => true,
    feature: (f: string) => {
      switch (f) {
        case 'ml':
          return { isEnabled: () => true };
        case 'security':
          return { isEnabled: () => false };
      }
    },
    license: {
      isOneOf: () => false,
      isActive: () => true,
      getType: () => 'basic',
    },
  },
} as any;

const xpackMainPluginWithSecurityBasicLicense = {
  info: {
    isAvailable: () => true,
    feature: (f: string) => {
      switch (f) {
        case 'ml':
          return { isEnabled: () => true };
        case 'security':
          return { isEnabled: () => true };
      }
    },
    license: {
      isOneOf: () => false,
      isActive: () => true,
      getType: () => 'basic',
    },
  },
} as any;

const mlIsEnabled = async () => true;
const mlIsNotEnabled = async () => false;

describe('check_privileges', () => {
  describe('getPrivileges() - right number of capabilities', () => {
    test('es capabilities count', async done => {
      const count = mlPrivileges.cluster.length;
      expect(count).toBe(27);
      done();
    });

    test('kibana capabilities count', async done => {
      const callWithRequest = callWithRequestProvider('partialPrivileges');
      const { getPrivileges } = privilegesProvider(
        callWithRequest,
        xpackMainPluginWithSecurity,
        mlIsEnabled
      );
      const { capabilities } = await getPrivileges();
      const count = Object.keys(capabilities).length;
      expect(count).toBe(22);
      done();
    });
  });

  describe('getPrivileges() with security', () => {
    test('ml_user capabilities only', async done => {
      const callWithRequest = callWithRequestProvider('partialPrivileges');
      const { getPrivileges } = privilegesProvider(
        callWithRequest,
        xpackMainPluginWithSecurity,
        mlIsEnabled
      );
      const { capabilities, upgradeInProgress, mlFeatureEnabledInSpace } = await getPrivileges();
      expect(upgradeInProgress).toBe(false);
      expect(mlFeatureEnabledInSpace).toBe(true);
      expect(capabilities.canGetJobs).toBe(true);
      expect(capabilities.canCreateJob).toBe(false);
      expect(capabilities.canDeleteJob).toBe(false);
      expect(capabilities.canOpenJob).toBe(false);
      expect(capabilities.canCloseJob).toBe(false);
      expect(capabilities.canForecastJob).toBe(false);
      expect(capabilities.canGetDatafeeds).toBe(true);
      expect(capabilities.canStartStopDatafeed).toBe(false);
      expect(capabilities.canUpdateJob).toBe(false);
      expect(capabilities.canUpdateDatafeed).toBe(false);
      expect(capabilities.canPreviewDatafeed).toBe(false);
      expect(capabilities.canGetCalendars).toBe(true);
      expect(capabilities.canCreateCalendar).toBe(false);
      expect(capabilities.canDeleteCalendar).toBe(false);
      expect(capabilities.canGetFilters).toBe(false);
      expect(capabilities.canCreateFilter).toBe(false);
      expect(capabilities.canDeleteFilter).toBe(false);
      expect(capabilities.canFindFileStructure).toBe(true);
      expect(capabilities.canGetDataFrameAnalytics).toBe(true);
      expect(capabilities.canDeleteDataFrameAnalytics).toBe(false);
      expect(capabilities.canCreateDataFrameAnalytics).toBe(false);
      expect(capabilities.canStartStopDataFrameAnalytics).toBe(false);
      done();
    });

    test('full capabilities', async done => {
      const callWithRequest = callWithRequestProvider('fullPrivileges');
      const { getPrivileges } = privilegesProvider(
        callWithRequest,
        xpackMainPluginWithSecurity,
        mlIsEnabled
      );
      const { capabilities, upgradeInProgress, mlFeatureEnabledInSpace } = await getPrivileges();
      expect(upgradeInProgress).toBe(false);
      expect(mlFeatureEnabledInSpace).toBe(true);
      expect(capabilities.canGetJobs).toBe(true);
      expect(capabilities.canCreateJob).toBe(true);
      expect(capabilities.canDeleteJob).toBe(true);
      expect(capabilities.canOpenJob).toBe(true);
      expect(capabilities.canCloseJob).toBe(true);
      expect(capabilities.canForecastJob).toBe(true);
      expect(capabilities.canGetDatafeeds).toBe(true);
      expect(capabilities.canStartStopDatafeed).toBe(true);
      expect(capabilities.canUpdateJob).toBe(true);
      expect(capabilities.canUpdateDatafeed).toBe(true);
      expect(capabilities.canPreviewDatafeed).toBe(true);
      expect(capabilities.canGetCalendars).toBe(true);
      expect(capabilities.canCreateCalendar).toBe(true);
      expect(capabilities.canDeleteCalendar).toBe(true);
      expect(capabilities.canGetFilters).toBe(true);
      expect(capabilities.canCreateFilter).toBe(true);
      expect(capabilities.canDeleteFilter).toBe(true);
      expect(capabilities.canFindFileStructure).toBe(true);
      expect(capabilities.canGetDataFrameAnalytics).toBe(true);
      expect(capabilities.canDeleteDataFrameAnalytics).toBe(true);
      expect(capabilities.canCreateDataFrameAnalytics).toBe(true);
      expect(capabilities.canStartStopDataFrameAnalytics).toBe(true);
      done();
    });

    test('upgrade in progress with full capabilities', async done => {
      const callWithRequest = callWithRequestProvider('upgradeWithFullPrivileges');
      const { getPrivileges } = privilegesProvider(
        callWithRequest,
        xpackMainPluginWithSecurity,
        mlIsEnabled
      );
      const { capabilities, upgradeInProgress, mlFeatureEnabledInSpace } = await getPrivileges();
      expect(upgradeInProgress).toBe(true);
      expect(mlFeatureEnabledInSpace).toBe(true);
      expect(capabilities.canGetJobs).toBe(true);
      expect(capabilities.canCreateJob).toBe(false);
      expect(capabilities.canDeleteJob).toBe(false);
      expect(capabilities.canOpenJob).toBe(false);
      expect(capabilities.canCloseJob).toBe(false);
      expect(capabilities.canForecastJob).toBe(false);
      expect(capabilities.canGetDatafeeds).toBe(true);
      expect(capabilities.canStartStopDatafeed).toBe(false);
      expect(capabilities.canUpdateJob).toBe(false);
      expect(capabilities.canUpdateDatafeed).toBe(false);
      expect(capabilities.canPreviewDatafeed).toBe(false);
      expect(capabilities.canGetCalendars).toBe(true);
      expect(capabilities.canCreateCalendar).toBe(false);
      expect(capabilities.canDeleteCalendar).toBe(false);
      expect(capabilities.canGetFilters).toBe(true);
      expect(capabilities.canCreateFilter).toBe(false);
      expect(capabilities.canDeleteFilter).toBe(false);
      expect(capabilities.canFindFileStructure).toBe(true);
      expect(capabilities.canGetDataFrameAnalytics).toBe(true);
      expect(capabilities.canDeleteDataFrameAnalytics).toBe(false);
      expect(capabilities.canCreateDataFrameAnalytics).toBe(false);
      expect(capabilities.canStartStopDataFrameAnalytics).toBe(false);
      done();
    });

    test('upgrade in progress with partial capabilities', async done => {
      const callWithRequest = callWithRequestProvider('upgradeWithPartialPrivileges');
      const { getPrivileges } = privilegesProvider(
        callWithRequest,
        xpackMainPluginWithSecurity,
        mlIsEnabled
      );
      const { capabilities, upgradeInProgress, mlFeatureEnabledInSpace } = await getPrivileges();
      expect(upgradeInProgress).toBe(true);
      expect(mlFeatureEnabledInSpace).toBe(true);
      expect(capabilities.canGetJobs).toBe(true);
      expect(capabilities.canCreateJob).toBe(false);
      expect(capabilities.canDeleteJob).toBe(false);
      expect(capabilities.canOpenJob).toBe(false);
      expect(capabilities.canCloseJob).toBe(false);
      expect(capabilities.canForecastJob).toBe(false);
      expect(capabilities.canGetDatafeeds).toBe(true);
      expect(capabilities.canStartStopDatafeed).toBe(false);
      expect(capabilities.canUpdateJob).toBe(false);
      expect(capabilities.canUpdateDatafeed).toBe(false);
      expect(capabilities.canPreviewDatafeed).toBe(false);
      expect(capabilities.canGetCalendars).toBe(true);
      expect(capabilities.canCreateCalendar).toBe(false);
      expect(capabilities.canDeleteCalendar).toBe(false);
      expect(capabilities.canGetFilters).toBe(false);
      expect(capabilities.canCreateFilter).toBe(false);
      expect(capabilities.canDeleteFilter).toBe(false);
      expect(capabilities.canFindFileStructure).toBe(true);
      expect(capabilities.canGetDataFrameAnalytics).toBe(true);
      expect(capabilities.canDeleteDataFrameAnalytics).toBe(false);
      expect(capabilities.canCreateDataFrameAnalytics).toBe(false);
      expect(capabilities.canStartStopDataFrameAnalytics).toBe(false);
      done();
    });

    test('ml_user capabilities with security with basic license', async done => {
      const callWithRequest = callWithRequestProvider('partialPrivileges');
      const { getPrivileges } = privilegesProvider(
        callWithRequest,
        xpackMainPluginWithSecurityBasicLicense,
        mlIsEnabled
      );
      const { capabilities, upgradeInProgress, mlFeatureEnabledInSpace } = await getPrivileges();
      expect(upgradeInProgress).toBe(false);
      expect(mlFeatureEnabledInSpace).toBe(true);
      expect(capabilities.canGetJobs).toBe(false);
      expect(capabilities.canCreateJob).toBe(false);
      expect(capabilities.canDeleteJob).toBe(false);
      expect(capabilities.canOpenJob).toBe(false);
      expect(capabilities.canCloseJob).toBe(false);
      expect(capabilities.canForecastJob).toBe(false);
      expect(capabilities.canGetDatafeeds).toBe(false);
      expect(capabilities.canStartStopDatafeed).toBe(false);
      expect(capabilities.canUpdateJob).toBe(false);
      expect(capabilities.canUpdateDatafeed).toBe(false);
      expect(capabilities.canPreviewDatafeed).toBe(false);
      expect(capabilities.canGetCalendars).toBe(false);
      expect(capabilities.canCreateCalendar).toBe(false);
      expect(capabilities.canDeleteCalendar).toBe(false);
      expect(capabilities.canGetFilters).toBe(false);
      expect(capabilities.canCreateFilter).toBe(false);
      expect(capabilities.canDeleteFilter).toBe(false);
      expect(capabilities.canFindFileStructure).toBe(true);
      expect(capabilities.canGetDataFrameAnalytics).toBe(false);
      expect(capabilities.canDeleteDataFrameAnalytics).toBe(false);
      expect(capabilities.canCreateDataFrameAnalytics).toBe(false);
      expect(capabilities.canStartStopDataFrameAnalytics).toBe(false);
      done();
    });

    test('full user with security with basic license', async done => {
      const callWithRequest = callWithRequestProvider('fullPrivileges');
      const { getPrivileges } = privilegesProvider(
        callWithRequest,
        xpackMainPluginWithSecurityBasicLicense,
        mlIsEnabled
      );
      const { capabilities, upgradeInProgress, mlFeatureEnabledInSpace } = await getPrivileges();
      expect(upgradeInProgress).toBe(false);
      expect(mlFeatureEnabledInSpace).toBe(true);
      expect(capabilities.canGetJobs).toBe(false);
      expect(capabilities.canCreateJob).toBe(false);
      expect(capabilities.canDeleteJob).toBe(false);
      expect(capabilities.canOpenJob).toBe(false);
      expect(capabilities.canCloseJob).toBe(false);
      expect(capabilities.canForecastJob).toBe(false);
      expect(capabilities.canGetDatafeeds).toBe(false);
      expect(capabilities.canStartStopDatafeed).toBe(false);
      expect(capabilities.canUpdateJob).toBe(false);
      expect(capabilities.canUpdateDatafeed).toBe(false);
      expect(capabilities.canPreviewDatafeed).toBe(false);
      expect(capabilities.canGetCalendars).toBe(false);
      expect(capabilities.canCreateCalendar).toBe(false);
      expect(capabilities.canDeleteCalendar).toBe(false);
      expect(capabilities.canGetFilters).toBe(false);
      expect(capabilities.canCreateFilter).toBe(false);
      expect(capabilities.canDeleteFilter).toBe(false);
      expect(capabilities.canFindFileStructure).toBe(true);
      expect(capabilities.canGetDataFrameAnalytics).toBe(false);
      expect(capabilities.canDeleteDataFrameAnalytics).toBe(false);
      expect(capabilities.canCreateDataFrameAnalytics).toBe(false);
      expect(capabilities.canStartStopDataFrameAnalytics).toBe(false);
      done();
    });

    test('full capabilities, ml disabled in space', async done => {
      const callWithRequest = callWithRequestProvider('fullPrivileges');
      const { getPrivileges } = privilegesProvider(
        callWithRequest,
        xpackMainPluginWithSecurity,
        mlIsNotEnabled
      );
      const { capabilities, upgradeInProgress, mlFeatureEnabledInSpace } = await getPrivileges();
      expect(upgradeInProgress).toBe(false);
      expect(mlFeatureEnabledInSpace).toBe(false);
      expect(capabilities.canGetJobs).toBe(false);
      expect(capabilities.canCreateJob).toBe(false);
      expect(capabilities.canDeleteJob).toBe(false);
      expect(capabilities.canOpenJob).toBe(false);
      expect(capabilities.canCloseJob).toBe(false);
      expect(capabilities.canForecastJob).toBe(false);
      expect(capabilities.canGetDatafeeds).toBe(false);
      expect(capabilities.canStartStopDatafeed).toBe(false);
      expect(capabilities.canUpdateJob).toBe(false);
      expect(capabilities.canUpdateDatafeed).toBe(false);
      expect(capabilities.canPreviewDatafeed).toBe(false);
      expect(capabilities.canGetCalendars).toBe(false);
      expect(capabilities.canCreateCalendar).toBe(false);
      expect(capabilities.canDeleteCalendar).toBe(false);
      expect(capabilities.canGetFilters).toBe(false);
      expect(capabilities.canCreateFilter).toBe(false);
      expect(capabilities.canDeleteFilter).toBe(false);
      expect(capabilities.canFindFileStructure).toBe(false);
      expect(capabilities.canGetDataFrameAnalytics).toBe(false);
      expect(capabilities.canDeleteDataFrameAnalytics).toBe(false);
      expect(capabilities.canCreateDataFrameAnalytics).toBe(false);
      expect(capabilities.canStartStopDataFrameAnalytics).toBe(false);
      done();
    });
  });

  describe('getPrivileges() without security', () => {
    test('ml_user capabilities only', async done => {
      const callWithRequest = callWithRequestProvider('partialPrivileges');
      const { getPrivileges } = privilegesProvider(
        callWithRequest,
        xpackMainPluginWithOutSecurity,
        mlIsEnabled
      );
      const { capabilities, upgradeInProgress, mlFeatureEnabledInSpace } = await getPrivileges();
      expect(upgradeInProgress).toBe(false);
      expect(mlFeatureEnabledInSpace).toBe(true);
      expect(capabilities.canGetJobs).toBe(true);
      expect(capabilities.canCreateJob).toBe(true);
      expect(capabilities.canDeleteJob).toBe(true);
      expect(capabilities.canOpenJob).toBe(true);
      expect(capabilities.canCloseJob).toBe(true);
      expect(capabilities.canForecastJob).toBe(true);
      expect(capabilities.canGetDatafeeds).toBe(true);
      expect(capabilities.canStartStopDatafeed).toBe(true);
      expect(capabilities.canUpdateJob).toBe(true);
      expect(capabilities.canUpdateDatafeed).toBe(true);
      expect(capabilities.canPreviewDatafeed).toBe(true);
      expect(capabilities.canGetCalendars).toBe(true);
      expect(capabilities.canCreateCalendar).toBe(true);
      expect(capabilities.canDeleteCalendar).toBe(true);
      expect(capabilities.canGetFilters).toBe(true);
      expect(capabilities.canCreateFilter).toBe(true);
      expect(capabilities.canDeleteFilter).toBe(true);
      expect(capabilities.canFindFileStructure).toBe(true);
      expect(capabilities.canGetDataFrameAnalytics).toBe(true);
      expect(capabilities.canDeleteDataFrameAnalytics).toBe(true);
      expect(capabilities.canCreateDataFrameAnalytics).toBe(true);
      expect(capabilities.canStartStopDataFrameAnalytics).toBe(true);
      done();
    });

    test('upgrade in progress with full capabilities', async done => {
      const callWithRequest = callWithRequestProvider('upgradeWithFullPrivileges');
      const { getPrivileges } = privilegesProvider(
        callWithRequest,
        xpackMainPluginWithOutSecurity,
        mlIsEnabled
      );
      const { capabilities, upgradeInProgress, mlFeatureEnabledInSpace } = await getPrivileges();
      expect(upgradeInProgress).toBe(true);
      expect(mlFeatureEnabledInSpace).toBe(true);
      expect(capabilities.canGetJobs).toBe(true);
      expect(capabilities.canCreateJob).toBe(false);
      expect(capabilities.canDeleteJob).toBe(false);
      expect(capabilities.canOpenJob).toBe(false);
      expect(capabilities.canCloseJob).toBe(false);
      expect(capabilities.canForecastJob).toBe(false);
      expect(capabilities.canGetDatafeeds).toBe(true);
      expect(capabilities.canStartStopDatafeed).toBe(false);
      expect(capabilities.canUpdateJob).toBe(false);
      expect(capabilities.canUpdateDatafeed).toBe(false);
      expect(capabilities.canPreviewDatafeed).toBe(false);
      expect(capabilities.canGetCalendars).toBe(true);
      expect(capabilities.canCreateCalendar).toBe(false);
      expect(capabilities.canDeleteCalendar).toBe(false);
      expect(capabilities.canGetFilters).toBe(true);
      expect(capabilities.canCreateFilter).toBe(false);
      expect(capabilities.canDeleteFilter).toBe(false);
      expect(capabilities.canFindFileStructure).toBe(true);
      expect(capabilities.canGetDataFrameAnalytics).toBe(true);
      expect(capabilities.canDeleteDataFrameAnalytics).toBe(false);
      expect(capabilities.canCreateDataFrameAnalytics).toBe(false);
      expect(capabilities.canStartStopDataFrameAnalytics).toBe(false);
      done();
    });

    test('upgrade in progress with partial capabilities', async done => {
      const callWithRequest = callWithRequestProvider('upgradeWithPartialPrivileges');
      const { getPrivileges } = privilegesProvider(
        callWithRequest,
        xpackMainPluginWithOutSecurity,
        mlIsEnabled
      );
      const { capabilities, upgradeInProgress, mlFeatureEnabledInSpace } = await getPrivileges();
      expect(upgradeInProgress).toBe(true);
      expect(mlFeatureEnabledInSpace).toBe(true);
      expect(capabilities.canGetJobs).toBe(true);
      expect(capabilities.canCreateJob).toBe(false);
      expect(capabilities.canDeleteJob).toBe(false);
      expect(capabilities.canOpenJob).toBe(false);
      expect(capabilities.canCloseJob).toBe(false);
      expect(capabilities.canForecastJob).toBe(false);
      expect(capabilities.canGetDatafeeds).toBe(true);
      expect(capabilities.canStartStopDatafeed).toBe(false);
      expect(capabilities.canUpdateJob).toBe(false);
      expect(capabilities.canUpdateDatafeed).toBe(false);
      expect(capabilities.canPreviewDatafeed).toBe(false);
      expect(capabilities.canGetCalendars).toBe(true);
      expect(capabilities.canCreateCalendar).toBe(false);
      expect(capabilities.canDeleteCalendar).toBe(false);
      expect(capabilities.canGetFilters).toBe(true);
      expect(capabilities.canCreateFilter).toBe(false);
      expect(capabilities.canDeleteFilter).toBe(false);
      expect(capabilities.canFindFileStructure).toBe(true);
      expect(capabilities.canGetDataFrameAnalytics).toBe(true);
      expect(capabilities.canDeleteDataFrameAnalytics).toBe(false);
      expect(capabilities.canCreateDataFrameAnalytics).toBe(false);
      expect(capabilities.canStartStopDataFrameAnalytics).toBe(false);
      done();
    });

    test('ml_user capabilities without security with basic license', async done => {
      const callWithRequest = callWithRequestProvider('partialPrivileges');
      const { getPrivileges } = privilegesProvider(
        callWithRequest,
        xpackMainPluginWithOutSecurityBasicLicense,
        mlIsEnabled
      );
      const { capabilities, upgradeInProgress, mlFeatureEnabledInSpace } = await getPrivileges();
      expect(upgradeInProgress).toBe(false);
      expect(mlFeatureEnabledInSpace).toBe(true);
      expect(capabilities.canGetJobs).toBe(false);
      expect(capabilities.canCreateJob).toBe(false);
      expect(capabilities.canDeleteJob).toBe(false);
      expect(capabilities.canOpenJob).toBe(false);
      expect(capabilities.canCloseJob).toBe(false);
      expect(capabilities.canForecastJob).toBe(false);
      expect(capabilities.canGetDatafeeds).toBe(false);
      expect(capabilities.canStartStopDatafeed).toBe(false);
      expect(capabilities.canUpdateJob).toBe(false);
      expect(capabilities.canUpdateDatafeed).toBe(false);
      expect(capabilities.canPreviewDatafeed).toBe(false);
      expect(capabilities.canGetCalendars).toBe(false);
      expect(capabilities.canCreateCalendar).toBe(false);
      expect(capabilities.canDeleteCalendar).toBe(false);
      expect(capabilities.canGetFilters).toBe(false);
      expect(capabilities.canCreateFilter).toBe(false);
      expect(capabilities.canDeleteFilter).toBe(false);
      expect(capabilities.canFindFileStructure).toBe(true);
      expect(capabilities.canGetDataFrameAnalytics).toBe(false);
      expect(capabilities.canDeleteDataFrameAnalytics).toBe(false);
      expect(capabilities.canCreateDataFrameAnalytics).toBe(false);
      expect(capabilities.canStartStopDataFrameAnalytics).toBe(false);
      done();
    });

    test('full user without security with basic license', async done => {
      const callWithRequest = callWithRequestProvider('fullPrivileges');
      const { getPrivileges } = privilegesProvider(
        callWithRequest,
        xpackMainPluginWithOutSecurityBasicLicense,
        mlIsEnabled
      );
      const { capabilities, upgradeInProgress, mlFeatureEnabledInSpace } = await getPrivileges();
      expect(upgradeInProgress).toBe(false);
      expect(mlFeatureEnabledInSpace).toBe(true);
      expect(capabilities.canGetJobs).toBe(false);
      expect(capabilities.canCreateJob).toBe(false);
      expect(capabilities.canDeleteJob).toBe(false);
      expect(capabilities.canOpenJob).toBe(false);
      expect(capabilities.canCloseJob).toBe(false);
      expect(capabilities.canForecastJob).toBe(false);
      expect(capabilities.canGetDatafeeds).toBe(false);
      expect(capabilities.canStartStopDatafeed).toBe(false);
      expect(capabilities.canUpdateJob).toBe(false);
      expect(capabilities.canUpdateDatafeed).toBe(false);
      expect(capabilities.canPreviewDatafeed).toBe(false);
      expect(capabilities.canGetCalendars).toBe(false);
      expect(capabilities.canCreateCalendar).toBe(false);
      expect(capabilities.canDeleteCalendar).toBe(false);
      expect(capabilities.canGetFilters).toBe(false);
      expect(capabilities.canCreateFilter).toBe(false);
      expect(capabilities.canDeleteFilter).toBe(false);
      expect(capabilities.canFindFileStructure).toBe(true);
      expect(capabilities.canGetDataFrameAnalytics).toBe(false);
      expect(capabilities.canDeleteDataFrameAnalytics).toBe(false);
      expect(capabilities.canCreateDataFrameAnalytics).toBe(false);
      expect(capabilities.canStartStopDataFrameAnalytics).toBe(false);
      done();
    });

    test('ml_user capabilities only, ml disabled in space', async done => {
      const callWithRequest = callWithRequestProvider('partialPrivileges');
      const { getPrivileges } = privilegesProvider(
        callWithRequest,
        xpackMainPluginWithOutSecurity,
        mlIsNotEnabled
      );
      const { capabilities, upgradeInProgress, mlFeatureEnabledInSpace } = await getPrivileges();
      expect(upgradeInProgress).toBe(false);
      expect(mlFeatureEnabledInSpace).toBe(false);
      expect(capabilities.canGetJobs).toBe(false);
      expect(capabilities.canCreateJob).toBe(false);
      expect(capabilities.canDeleteJob).toBe(false);
      expect(capabilities.canOpenJob).toBe(false);
      expect(capabilities.canCloseJob).toBe(false);
      expect(capabilities.canForecastJob).toBe(false);
      expect(capabilities.canGetDatafeeds).toBe(false);
      expect(capabilities.canStartStopDatafeed).toBe(false);
      expect(capabilities.canUpdateJob).toBe(false);
      expect(capabilities.canUpdateDatafeed).toBe(false);
      expect(capabilities.canPreviewDatafeed).toBe(false);
      expect(capabilities.canGetCalendars).toBe(false);
      expect(capabilities.canCreateCalendar).toBe(false);
      expect(capabilities.canDeleteCalendar).toBe(false);
      expect(capabilities.canGetFilters).toBe(false);
      expect(capabilities.canCreateFilter).toBe(false);
      expect(capabilities.canDeleteFilter).toBe(false);
      expect(capabilities.canFindFileStructure).toBe(false);
      expect(capabilities.canGetDataFrameAnalytics).toBe(false);
      expect(capabilities.canDeleteDataFrameAnalytics).toBe(false);
      expect(capabilities.canCreateDataFrameAnalytics).toBe(false);
      expect(capabilities.canStartStopDataFrameAnalytics).toBe(false);
      done();
    });
  });
});
