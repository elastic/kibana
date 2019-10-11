/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConfigTemplate } from './types';

/**
 * Config Templates w/ corresponding defaultIndexPattern and jobId's of the SIEM Jobs embedded
 * in ML. Added as part of: https://github.com/elastic/kibana/pull/39678/files
 */
export const configTemplates: ConfigTemplate[] = [
  {
    name: 'siem_auditbeat_ecs',
    defaultIndexPattern: 'auditbeat-*',
    jobs: [
      'rare_process_by_host_linux_ecs',
      'suspicious_login_activity_ecs',
      'linux_anomalous_network_activity_ecs',
      'linux_anomalous_network_port_activity_ecs',
      'linux_anomalous_network_service',
      'linux_anomalous_network_url_activity_ecs',
      'linux_anomalous_process_all_hosts_ecs',
      'linux_anomalous_user_name_ecs',
    ],
  },
  {
    name: 'siem_winlogbeat_ecs',
    defaultIndexPattern: 'winlogbeat-*',
    jobs: [
      'rare_process_by_host_windows_ecs',
      'windows_anomalous_network_activity_ecs',
      'windows_anomalous_path_activity_ecs',
      'windows_anomalous_process_all_hosts_ecs',
      'windows_anomalous_process_creation',
      'windows_anomalous_script',
      'windows_anomalous_service',
      'windows_anomalous_user_name_ecs',
    ],
  },
];
