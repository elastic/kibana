/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConfigTemplate } from './types';

export const siemJobPrefix = 'siem-api-';

/**
 * Config Templates w/ corresponding defaultIndexPattern and jobId's of the SIEM Jobs embedded
 * in ML. Added as part of: https://github.com/elastic/kibana/pull/39678/files
 */
export const configTemplates: ConfigTemplate[] = [
  {
    name: 'siem_auditbeat_ecs',
    defaultIndexPattern: 'auditbeat-*',
    jobs: [
      `${siemJobPrefix}rare_process_linux_ecs`,
      `${siemJobPrefix}suspicious_login_activity_ecs`,
    ],
  },
  {
    name: 'siem_winlogbeat_ecs',
    defaultIndexPattern: 'winlogbeat-*',
    jobs: [`${siemJobPrefix}rare_process_windows_ecs`],
  },
];
