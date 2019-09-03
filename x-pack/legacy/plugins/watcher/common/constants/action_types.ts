/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ACTION_TYPES: { [key: string]: string } = {
  EMAIL: 'email',

  WEBHOOK: 'webhook',

  INDEX: 'index',

  LOGGING: 'logging',

  SLACK: 'slack',

  JIRA: 'jira',

  PAGERDUTY: 'pagerduty',

  UNKNOWN: 'unknown/invalid',
};
