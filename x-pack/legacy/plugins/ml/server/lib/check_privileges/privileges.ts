/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mlPrivileges = {
  cluster: [
    'cluster:monitor/xpack/ml/job/get',
    'cluster:monitor/xpack/ml/job/stats/get',
    'cluster:monitor/xpack/ml/datafeeds/get',
    'cluster:monitor/xpack/ml/datafeeds/stats/get',
    'cluster:monitor/xpack/ml/calendars/get',
    'cluster:admin/xpack/ml/job/put',
    'cluster:admin/xpack/ml/job/delete',
    'cluster:admin/xpack/ml/job/update',
    'cluster:admin/xpack/ml/job/open',
    'cluster:admin/xpack/ml/job/close',
    'cluster:admin/xpack/ml/job/forecast',
    'cluster:admin/xpack/ml/datafeeds/put',
    'cluster:admin/xpack/ml/datafeeds/delete',
    'cluster:admin/xpack/ml/datafeeds/start',
    'cluster:admin/xpack/ml/datafeeds/stop',
    'cluster:admin/xpack/ml/datafeeds/update',
    'cluster:admin/xpack/ml/datafeeds/preview',
    'cluster:admin/xpack/ml/calendars/put',
    'cluster:admin/xpack/ml/calendars/delete',
    'cluster:admin/xpack/ml/calendars/jobs/update',
    'cluster:admin/xpack/ml/calendars/events/post',
    'cluster:admin/xpack/ml/calendars/events/delete',
    'cluster:admin/xpack/ml/filters/put',
    'cluster:admin/xpack/ml/filters/get',
    'cluster:admin/xpack/ml/filters/update',
    'cluster:admin/xpack/ml/filters/delete',
    'cluster:monitor/xpack/ml/findfilestructure',
  ],
};
