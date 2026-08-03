/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';

export const GROK_DEBUGGER_TAGS = [
  ...tags.stateful.classic,
  ...tags.serverless.observability.complete,
  ...tags.serverless.security.complete,
];

export const GROK_DEBUGGER_USER_ROLE = {
  elasticsearch: {
    cluster: ['manage_pipeline', 'monitor'],
  },
  kibana: [
    {
      base: [],
      feature: {
        advancedSettings: ['read'],
        dev_tools: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

export const BUILT_IN_PATTERN_TEST_DATA = {
  event: 'SegerCommaBob',
  pattern: '%{USERNAME:u}',
  structuredEvent: {
    u: 'SegerCommaBob',
  },
} as const;

export const CUSTOM_PATTERN_TEST_DATA = {
  event:
    'Jan  1 06:25:43 mailserver14 postfix/cleanup[21403]: BEF25A72965: message-id=<20130101142543.5828399CCAF@mailserver14.example.com>',
  pattern: '%{SYSLOGBASE} %{POSTFIX_QUEUEID:queue_id}: %{MSG:syslog_message}',
  customPattern: 'POSTFIX_QUEUEID [0-9A-F]{10,11}\nMSG message-id=<%{GREEDYDATA}>',
  structuredEvent: {
    pid: '21403',
    program: 'postfix/cleanup',
    logsource: 'mailserver14',
    syslog_message: 'message-id=<20130101142543.5828399CCAF@mailserver14.example.com>',
    queue_id: 'BEF25A72965',
    timestamp: 'Jan  1 06:25:43',
  },
} as const;
