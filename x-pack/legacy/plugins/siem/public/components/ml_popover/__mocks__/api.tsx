/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Group, IndexPatternSavedObject, Job } from '../types';

export const mockGroupsResponse: Group[] = [
  {
    id: 'siem',
    jobIds: [
      'rc-original-suspicious-login-activity-2',
      'rc-rare-process-linux-7',
      'rc-rare-process-windows-5',
      'siem-api-rare_process_linux_ecs',
      'siem-api-rare_process_windows_ecs',
      'siem-api-suspicious_login_activity_ecs',
    ],
    calendarIds: [],
  },
  { id: 'suricata', jobIds: ['suricata_alert_rate'], calendarIds: [] },
];

export const mockOpenedJob: Job = {
  datafeedId: 'datafeed-siem-api-rare_process_linux_ecs',
  datafeedIndices: ['auditbeat-*'],
  datafeedState: 'started',
  description: 'SIEM Auditbeat: Detect unusually rare processes on Linux (beta)',
  earliestTimestampMs: 1561651364098,
  groups: ['siem'],
  hasDatafeed: true,
  id: 'siem-api-rare_process_linux_ecs',
  isSingleMetricViewerJob: true,
  jobState: 'opened',
  latestTimestampMs: 1562870521264,
  memory_status: 'hard_limit',
  nodeName: 'siem-es',
  processed_record_count: 3425264,
};

export const mockJobsSummaryResponse: Job[] = [
  {
    id: 'rc-rare-process-windows-5',
    description:
      'Looks for rare and anomalous processes on a Windows host. Requires process execution events from Sysmon.',
    groups: ['host'],
    processed_record_count: 8577,
    memory_status: 'ok',
    jobState: 'closed',
    hasDatafeed: true,
    datafeedId: 'datafeed-rc-rare-process-windows-5',
    datafeedIndices: ['winlogbeat-*'],
    datafeedState: 'stopped',
    latestTimestampMs: 1561402325194,
    earliestTimestampMs: 1554327458406,
    isSingleMetricViewerJob: true,
  },
  {
    id: 'siem-api-rare_process_linux_ecs',
    description: 'SIEM Auditbeat: Detect unusually rare processes on Linux (beta)',
    groups: ['siem'],
    processed_record_count: 582251,
    memory_status: 'hard_limit',
    jobState: 'closed',
    hasDatafeed: true,
    datafeedId: 'datafeed-siem-api-rare_process_linux_ecs',
    datafeedIndices: ['auditbeat-*'],
    datafeedState: 'stopped',
    latestTimestampMs: 1557434782207,
    earliestTimestampMs: 1557353420495,
    isSingleMetricViewerJob: true,
  },
  {
    id: 'siem-api-rare_process_windows_ecs',
    description: 'SIEM Winlogbeat: Detect unusually rare processes on Windows (beta)',
    groups: ['siem'],
    processed_record_count: 0,
    memory_status: 'ok',
    jobState: 'closed',
    hasDatafeed: true,
    datafeedId: 'datafeed-siem-api-rare_process_windows_ecs',
    datafeedIndices: ['winlogbeat-*'],
    datafeedState: 'stopped',
    isSingleMetricViewerJob: true,
  },
  {
    id: 'siem-api-suspicious_login_activity_ecs',
    description: 'SIEM Auditbeat: Detect unusually high number of authentication attempts (beta)',
    groups: ['siem'],
    processed_record_count: 0,
    memory_status: 'ok',
    jobState: 'closed',
    hasDatafeed: true,
    datafeedId: 'datafeed-siem-api-suspicious_login_activity_ecs',
    datafeedIndices: ['auditbeat-*'],
    datafeedState: 'stopped',
    isSingleMetricViewerJob: true,
  },
];

export const mockConfigTemplates = [
  {
    name: 'siem_auditbeat_ecs',
    defaultIndexPattern: 'auditbeat-*',
    jobs: ['siem-api-rare_process_linux_ecs', 'siem-api-suspicious_login_activity_ecs'],
  },
  {
    name: 'siem_winlogbeat_ecs',
    defaultIndexPattern: 'winlogbeat-*',
    jobs: ['siem-api-rare_process_windows_ecs'],
  },
];

export const mockInstalledJobIds = ['siem-api-rare_process_linux_ecs'];

export const mockEmbeddedJobIds = [
  'siem-api-rare_process_linux_ecs',
  'siem-api-suspicious_login_activity_ecs',
  'siem-api-rare_process_windows_ecs',
];

export const mockIndexPatternSavedObjects: IndexPatternSavedObject[] = [
  {
    type: 'index-pattern',
    id: '2d1fe420-eeee-11e9-ad95-4b5e687c2aee',
    attributes: {
      title: 'filebeat-*',
    },
    updated_at: '2019-08-26T04:30:09.111Z',
    version: 'WzE4LLwxXQ==',
  },
  {
    type: 'index-pattern',
    id: '5463ec70-c7ba-ffff-ad95-4b5e687c2aee',
    attributes: {
      title: 'auditbeat-*',
    },
    updated_at: '2019-08-26T04:31:12.934Z',
    version: 'WzELLywxXQ==',
  },
];
