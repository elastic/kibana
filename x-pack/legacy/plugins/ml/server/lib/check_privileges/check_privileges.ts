/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import { Privileges, getDefaultPrivileges } from '../../../common/types/privileges';
import { XPackMainPlugin } from '../../../../xpack_main/server/xpack_main';
import { isSecurityDisabled } from '../../lib/security_utils';
import { upgradeCheckProvider } from './upgrade';
import { checkLicense } from '../check_license';
import { LICENSE_TYPE } from '../../../common/constants/license';

import { mlPrivileges } from './privileges';

type ClusterPrivilege = Record<string, boolean>;

interface Response {
  capabilities: Privileges;
  upgradeInProgress: boolean;
  isPlatinumOrTrialLicense: boolean;
  mlFeatureEnabledInSpace: boolean;
}

export function privilegesProvider(
  callAsCurrentUser: IScopedClusterClient['callAsCurrentUser'],
  xpackMainPlugin: XPackMainPlugin,
  isMlEnabledInSpace: () => Promise<boolean>,
  ignoreSpaces: boolean = false
) {
  const { isUpgradeInProgress } = upgradeCheckProvider(callAsCurrentUser);
  async function getPrivileges(): Promise<Response> {
    // get the default privileges, forced to be false.
    const privileges = getDefaultPrivileges();

    const upgradeInProgress = await isUpgradeInProgress();
    const securityDisabled = isSecurityDisabled(xpackMainPlugin);
    const license = checkLicense(xpackMainPlugin.info);
    const isPlatinumOrTrialLicense = license.licenseType === LICENSE_TYPE.FULL;
    const mlFeatureEnabledInSpace = await isMlEnabledInSpace();

    const setGettingPrivileges = isPlatinumOrTrialLicense
      ? setFullGettingPrivileges
      : setBasicGettingPrivileges;

    const setActionPrivileges = isPlatinumOrTrialLicense
      ? setFullActionPrivileges
      : setBasicActionPrivileges;

    if (mlFeatureEnabledInSpace === false && ignoreSpaces === false) {
      // if ML isn't enabled in the current space,
      // return with the default privileges (all false)
      return {
        capabilities: privileges,
        upgradeInProgress,
        isPlatinumOrTrialLicense,
        mlFeatureEnabledInSpace,
      };
    }

    if (securityDisabled === true) {
      if (upgradeInProgress === true) {
        // if security is disabled and an upgrade in is progress,
        // force all "getting" privileges to be true
        // leaving all "setting" privileges to be the default false
        setGettingPrivileges({}, privileges, true);
      } else {
        // if no upgrade is in progress,
        // get all privileges forced to true
        setGettingPrivileges({}, privileges, true);
        setActionPrivileges({}, privileges, true);
      }
    } else {
      // security enabled
      // load all ml privileges for this user.
      const { cluster } = await callAsCurrentUser('ml.privilegeCheck', { body: mlPrivileges });
      setGettingPrivileges(cluster, privileges);
      if (upgradeInProgress === false) {
        // if an upgrade is in progress, don't apply the "setting"
        // privileges. leave them to be the default false.
        setActionPrivileges(cluster, privileges);
      }
    }
    return {
      capabilities: privileges,
      upgradeInProgress,
      isPlatinumOrTrialLicense,
      mlFeatureEnabledInSpace,
    };
  }
  return { getPrivileges };
}

function setFullGettingPrivileges(
  cluster: ClusterPrivilege = {},
  privileges: Privileges,
  forceTrue = false
) {
  // Anomaly Detection
  if (
    forceTrue ||
    (cluster['cluster:monitor/xpack/ml/job/get'] &&
      cluster['cluster:monitor/xpack/ml/job/stats/get'])
  ) {
    privileges.canGetJobs = true;
  }

  if (
    forceTrue ||
    (cluster['cluster:monitor/xpack/ml/datafeeds/get'] &&
      cluster['cluster:monitor/xpack/ml/datafeeds/stats/get'])
  ) {
    privileges.canGetDatafeeds = true;
  }

  // Calendars
  if (forceTrue || cluster['cluster:monitor/xpack/ml/calendars/get']) {
    privileges.canGetCalendars = true;
  }

  // Filters
  if (forceTrue || cluster['cluster:admin/xpack/ml/filters/get']) {
    privileges.canGetFilters = true;
  }

  // File Data Visualizer
  if (forceTrue || cluster['cluster:monitor/xpack/ml/findfilestructure']) {
    privileges.canFindFileStructure = true;
  }

  // Data Frame Analytics
  if (
    forceTrue ||
    (cluster['cluster:monitor/xpack/ml/job/get'] &&
      cluster['cluster:monitor/xpack/ml/job/stats/get'])
  ) {
    privileges.canGetDataFrameAnalytics = true;
  }
}

function setFullActionPrivileges(
  cluster: ClusterPrivilege = {},
  privileges: Privileges,
  forceTrue = false
) {
  // Anomaly Detection
  if (
    forceTrue ||
    (cluster['cluster:admin/xpack/ml/job/put'] &&
      cluster['cluster:admin/xpack/ml/job/open'] &&
      cluster['cluster:admin/xpack/ml/datafeeds/put'])
  ) {
    privileges.canCreateJob = true;
  }

  if (forceTrue || cluster['cluster:admin/xpack/ml/job/update']) {
    privileges.canUpdateJob = true;
  }

  if (forceTrue || cluster['cluster:admin/xpack/ml/job/open']) {
    privileges.canOpenJob = true;
  }

  if (forceTrue || cluster['cluster:admin/xpack/ml/job/close']) {
    privileges.canCloseJob = true;
  }

  if (forceTrue || cluster['cluster:admin/xpack/ml/job/forecast']) {
    privileges.canForecastJob = true;
  }

  if (
    forceTrue ||
    (cluster['cluster:admin/xpack/ml/job/delete'] &&
      cluster['cluster:admin/xpack/ml/datafeeds/delete'])
  ) {
    privileges.canDeleteJob = true;
  }

  if (
    forceTrue ||
    (cluster['cluster:admin/xpack/ml/job/open'] &&
      cluster['cluster:admin/xpack/ml/datafeeds/start'] &&
      cluster['cluster:admin/xpack/ml/datafeeds/stop'])
  ) {
    privileges.canStartStopDatafeed = true;
  }

  if (forceTrue || cluster['cluster:admin/xpack/ml/datafeeds/update']) {
    privileges.canUpdateDatafeed = true;
  }

  if (forceTrue || cluster['cluster:admin/xpack/ml/datafeeds/preview']) {
    privileges.canPreviewDatafeed = true;
  }

  // Calendars
  if (
    forceTrue ||
    (cluster['cluster:admin/xpack/ml/calendars/put'] &&
      cluster['cluster:admin/xpack/ml/calendars/jobs/update'] &&
      cluster['cluster:admin/xpack/ml/calendars/events/post'])
  ) {
    privileges.canCreateCalendar = true;
  }

  if (
    forceTrue ||
    (cluster['cluster:admin/xpack/ml/calendars/delete'] &&
      cluster['cluster:admin/xpack/ml/calendars/events/delete'])
  ) {
    privileges.canDeleteCalendar = true;
  }

  // Filters
  if (
    forceTrue ||
    (cluster['cluster:admin/xpack/ml/filters/put'] &&
      cluster['cluster:admin/xpack/ml/filters/update'])
  ) {
    privileges.canCreateFilter = true;
  }

  if (forceTrue || cluster['cluster:admin/xpack/ml/filters/delete']) {
    privileges.canDeleteFilter = true;
  }

  // Data Frame Analytics
  if (
    forceTrue ||
    (cluster['cluster:admin/xpack/ml/job/put'] &&
      cluster['cluster:admin/xpack/ml/job/open'] &&
      cluster['cluster:admin/xpack/ml/datafeeds/put'])
  ) {
    privileges.canCreateDataFrameAnalytics = true;
  }

  if (
    forceTrue ||
    (cluster['cluster:admin/xpack/ml/job/delete'] &&
      cluster['cluster:admin/xpack/ml/datafeeds/delete'])
  ) {
    privileges.canDeleteDataFrameAnalytics = true;
  }

  if (
    forceTrue ||
    (cluster['cluster:admin/xpack/ml/job/open'] &&
      cluster['cluster:admin/xpack/ml/datafeeds/start'] &&
      cluster['cluster:admin/xpack/ml/datafeeds/stop'])
  ) {
    privileges.canStartStopDataFrameAnalytics = true;
  }
}

function setBasicGettingPrivileges(
  cluster: ClusterPrivilege = {},
  privileges: Privileges,
  forceTrue = false
) {
  // File Data Visualizer
  if (forceTrue || cluster['cluster:monitor/xpack/ml/findfilestructure']) {
    privileges.canFindFileStructure = true;
  }
}

function setBasicActionPrivileges(
  cluster: ClusterPrivilege = {},
  privileges: Privileges,
  forceTrue = false
) {}
