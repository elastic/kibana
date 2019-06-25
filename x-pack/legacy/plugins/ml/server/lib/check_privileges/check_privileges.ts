/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Privileges, getDefaultPrivileges } from '../../../common/types/privileges';
import { callWithRequestType } from '../../../common/types/kibana';
import { isSecurityDisabled } from '../../lib/security_utils';
import { upgradeCheckProvider } from './upgrade';

import { mlPrivileges } from './privileges';

type ClusterPrivilege = Record<string, boolean>;

interface Response {
  privileges: Privileges;
  upgradeInProgress: boolean;
}

export function privilegesProvider(callWithRequest: callWithRequestType, xpackMainPlugin: any) {
  const { isUpgradeInProgress } = upgradeCheckProvider(callWithRequest);
  async function getPrivileges(): Promise<Response> {
    let privileges = getDefaultPrivileges(false);

    const upgradeInProgress = await isUpgradeInProgress();
    const securityDisabled = isSecurityDisabled(xpackMainPlugin);

    if (securityDisabled === true) {
      if (upgradeInProgress === true) {
        setGettingPrivileges({}, privileges, true);
      } else {
        privileges = getDefaultPrivileges(true);
      }
    } else {
      const resp = await callWithRequest('ml.privilegeCheck', { body: mlPrivileges });
      setGettingPrivileges(resp.cluster, privileges);
      if (upgradeInProgress === false) {
        setActionPrivileges(resp.cluster, privileges);
      }
    }
    return { privileges, upgradeInProgress };
  }

  return { getPrivileges };
}

function setGettingPrivileges(
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

  // Data Frames
  if (
    forceTrue ||
    (cluster['cluster:monitor/data_frame/get'] && cluster['cluster:monitor/data_frame/stats/get'])
  ) {
    privileges.canGetDataFrameJobs = true;
  }
}

function setActionPrivileges(cluster: ClusterPrivilege = {}, privileges: Privileges) {
  // Anomaly Detection
  if (
    cluster['cluster:admin/xpack/ml/job/put'] &&
    cluster['cluster:admin/xpack/ml/job/open'] &&
    cluster['cluster:admin/xpack/ml/datafeeds/put']
  ) {
    privileges.canCreateJob = true;
  }

  if (cluster['cluster:admin/xpack/ml/job/update']) {
    privileges.canUpdateJob = true;
  }

  if (cluster['cluster:admin/xpack/ml/job/open']) {
    privileges.canOpenJob = true;
  }

  if (cluster['cluster:admin/xpack/ml/job/close']) {
    privileges.canCloseJob = true;
  }

  if (cluster['cluster:admin/xpack/ml/job/forecast']) {
    privileges.canForecastJob = true;
  }

  if (
    cluster['cluster:admin/xpack/ml/job/delete'] &&
    cluster['cluster:admin/xpack/ml/datafeeds/delete']
  ) {
    privileges.canDeleteJob = true;
  }

  if (
    cluster['cluster:admin/xpack/ml/job/open'] &&
    cluster['cluster:admin/xpack/ml/datafeeds/start'] &&
    cluster['cluster:admin/xpack/ml/datafeeds/stop']
  ) {
    privileges.canStartStopDatafeed = true;
  }

  if (cluster['cluster:admin/xpack/ml/datafeeds/update']) {
    privileges.canUpdateDatafeed = true;
  }

  if (cluster['cluster:admin/xpack/ml/datafeeds/preview']) {
    privileges.canPreviewDatafeed = true;
  }

  // Calendars
  if (
    cluster['cluster:admin/xpack/ml/calendars/put'] &&
    cluster['cluster:admin/xpack/ml/calendars/jobs/update'] &&
    cluster['cluster:admin/xpack/ml/calendars/events/post']
  ) {
    privileges.canCreateCalendar = true;
  }

  if (
    cluster['cluster:admin/xpack/ml/calendars/delete'] &&
    cluster['cluster:admin/xpack/ml/calendars/events/delete']
  ) {
    privileges.canDeleteCalendar = true;
  }

  // Filters
  if (
    cluster['cluster:admin/xpack/ml/filters/put'] &&
    cluster['cluster:admin/xpack/ml/filters/update']
  ) {
    privileges.canCreateFilter = true;
  }

  if (cluster['cluster:admin/xpack/ml/filters/delete']) {
    privileges.canDeleteFilter = true;
  }

  // Data Frames
  if (cluster['cluster:admin/data_frame/put']) {
    privileges.canCreateDataFrameJob = true;
  }

  if (cluster['cluster:admin/data_frame/delete']) {
    privileges.canDeleteDataFrameJob = true;
  }

  if (cluster['cluster:admin/data_frame/preview']) {
    privileges.canPreviewDataFrameJob = true;
  }

  if (
    cluster['cluster:admin/data_frame/start'] &&
    cluster['cluster:admin/data_frame/start_task'] &&
    cluster['cluster:admin/data_frame/stop']
  ) {
    privileges.canStartStopDataFrameJob = true;
  }
}
