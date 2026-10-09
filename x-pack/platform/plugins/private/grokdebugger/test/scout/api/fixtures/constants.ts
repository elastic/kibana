/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';

export const GROK_DEBUGGER_API_TAGS = [
  ...tags.stateful.classic,
  ...tags.serverless.observability.complete,
  ...tags.serverless.security.complete,
];

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};

export const BUILT_IN_PATTERN_TEST_DATA = {
  rawEvent: '55.3.244.1 GET /index.html 15824 0.043',
  pattern: '%{IP:client} %{WORD:method} %{URIPATHPARAM:request} %{NUMBER:bytes} %{NUMBER:duration}',
  structuredEvent: {
    duration: '0.043',
    request: '/index.html',
    method: 'GET',
    bytes: '15824',
    client: '55.3.244.1',
  },
} as const;

export const CUSTOM_PATTERN_TEST_DATA = {
  rawEvent:
    'Jan  1 06:25:43 mailserver14 postfix/cleanup[21403]: BEF25A72965: message-id=<20130101142543.5828399CCAF@mailserver14.example.com>',
  pattern: '%{SYSLOGBASE} %{POSTFIX_QUEUEID:queue_id}: %{MSG:syslog_message}',
  customPatterns: {
    MSG: 'message-id=<%{GREEDYDATA}>',
    POSTFIX_QUEUEID: '[0-9A-F]{10,11}',
  },
  structuredEvent: {
    pid: '21403',
    program: 'postfix/cleanup',
    logsource: 'mailserver14',
    syslog_message: 'message-id=<20130101142543.5828399CCAF@mailserver14.example.com>',
    queue_id: 'BEF25A72965',
    timestamp: 'Jan  1 06:25:43',
  },
} as const;
