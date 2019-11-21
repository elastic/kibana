/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function callWithRequestProvider(testType: string) {
  switch (testType) {
    case 'partialPrivileges':
      return partialPrivileges;
    case 'fullPrivileges':
      return fullPrivileges;
    case 'upgradeWithFullPrivileges':
      return upgradeWithFullPrivileges;
    case 'upgradeWithPartialPrivileges':
      return upgradeWithPartialPrivileges;

    default:
      return fullPrivileges;
  }
}

const fullPrivileges = async (action: string, params?: any) => {
  switch (action) {
    case 'ml.privilegeCheck':
      return {
        username: 'test2',
        has_all_requested: false,
        cluster: fullClusterPrivileges,
        index: {},
        application: {},
      };
    case 'ml.info':
      return { upgrade_mode: false };

    default:
      break;
  }
};

const partialPrivileges = async (action: string, params?: any) => {
  switch (action) {
    case 'ml.privilegeCheck':
      return {
        username: 'test2',
        has_all_requested: false,
        cluster: partialClusterPrivileges,
        index: {},
        application: {},
      };
    case 'ml.info':
      return { upgrade_mode: false };

    default:
      break;
  }
};

const upgradeWithFullPrivileges = async (action: string, params?: any) => {
  switch (action) {
    case 'ml.privilegeCheck':
      return {
        username: 'elastic',
        has_all_requested: true,
        cluster: fullClusterPrivileges,
        index: {},
        application: {},
      };
    case 'ml.info':
      return { upgrade_mode: true };

    default:
      break;
  }
};

const upgradeWithPartialPrivileges = async (action: string, params?: any) => {
  switch (action) {
    case 'ml.privilegeCheck':
      return {
        username: 'test2',
        has_all_requested: false,
        cluster: partialClusterPrivileges,
        index: {},
        application: {},
      };
    case 'ml.info':
      return { upgrade_mode: true };

    default:
      break;
  }
};

const fullClusterPrivileges = {
  'cluster:admin/xpack/ml/datafeeds/delete': true,
  'cluster:admin/xpack/ml/datafeeds/update': true,
  'cluster:admin/xpack/ml/job/forecast': true,
  'cluster:monitor/xpack/ml/job/stats/get': true,
  'cluster:admin/xpack/ml/filters/delete': true,
  'cluster:admin/xpack/ml/datafeeds/preview': true,
  'cluster:admin/xpack/ml/datafeeds/start': true,
  'cluster:admin/xpack/ml/filters/put': true,
  'cluster:admin/xpack/ml/datafeeds/stop': true,
  'cluster:monitor/xpack/ml/calendars/get': true,
  'cluster:admin/xpack/ml/filters/get': true,
  'cluster:monitor/xpack/ml/datafeeds/get': true,
  'cluster:admin/xpack/ml/filters/update': true,
  'cluster:admin/xpack/ml/calendars/events/post': true,
  'cluster:admin/xpack/ml/job/close': true,
  'cluster:monitor/xpack/ml/datafeeds/stats/get': true,
  'cluster:admin/xpack/ml/calendars/jobs/update': true,
  'cluster:admin/xpack/ml/calendars/put': true,
  'cluster:admin/xpack/ml/calendars/events/delete': true,
  'cluster:admin/xpack/ml/datafeeds/put': true,
  'cluster:admin/xpack/ml/job/open': true,
  'cluster:admin/xpack/ml/job/delete': true,
  'cluster:monitor/xpack/ml/job/get': true,
  'cluster:admin/xpack/ml/job/put': true,
  'cluster:admin/xpack/ml/job/update': true,
  'cluster:admin/xpack/ml/calendars/delete': true,
  'cluster:monitor/xpack/ml/findfilestructure': true,
};

// the same as ml_user role
const partialClusterPrivileges = {
  'cluster:admin/xpack/ml/datafeeds/delete': false,
  'cluster:admin/xpack/ml/datafeeds/update': false,
  'cluster:admin/xpack/ml/job/forecast': false,
  'cluster:monitor/xpack/ml/job/stats/get': true,
  'cluster:admin/xpack/ml/filters/delete': false,
  'cluster:admin/xpack/ml/datafeeds/preview': false,
  'cluster:admin/xpack/ml/datafeeds/start': false,
  'cluster:admin/xpack/ml/filters/put': false,
  'cluster:admin/xpack/ml/datafeeds/stop': false,
  'cluster:monitor/xpack/ml/calendars/get': true,
  'cluster:admin/xpack/ml/filters/get': false,
  'cluster:monitor/xpack/ml/datafeeds/get': true,
  'cluster:admin/xpack/ml/filters/update': false,
  'cluster:admin/xpack/ml/calendars/events/post': false,
  'cluster:admin/xpack/ml/job/close': false,
  'cluster:monitor/xpack/ml/datafeeds/stats/get': true,
  'cluster:admin/xpack/ml/calendars/jobs/update': false,
  'cluster:admin/xpack/ml/calendars/put': false,
  'cluster:admin/xpack/ml/calendars/events/delete': false,
  'cluster:admin/xpack/ml/datafeeds/put': false,
  'cluster:admin/xpack/ml/job/open': false,
  'cluster:admin/xpack/ml/job/delete': false,
  'cluster:monitor/xpack/ml/job/get': true,
  'cluster:admin/xpack/ml/job/put': false,
  'cluster:admin/xpack/ml/job/update': false,
  'cluster:admin/xpack/ml/calendars/delete': false,
  'cluster:monitor/xpack/ml/findfilestructure': true,
};
