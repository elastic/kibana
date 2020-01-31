/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface EmailActionParams {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  message: string;
}

export enum EventActionOptions {
  TRIGGER = 'trigger',
  RESOLVE = 'resolve',
  ACKNOWLEDGE = 'acknowledge',
}

export enum SeverityActionOptions {
  CRITICAL = 'critical',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export interface PagerDutyActionParams {
  eventAction?: EventActionOptions;
  dedupKey?: string;
  summary?: string;
  source?: string;
  severity?: SeverityActionOptions;
  timestamp?: string;
  component?: string;
  group?: string;
  class?: string;
}

export interface IndexActionParams {
  index?: string;
  refresh?: boolean;
  executionTimeField?: string;
  documents?: string[];
}

export enum ServerLogLevelOptions {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

export interface ServerLogActionParams {
  level: ServerLogLevelOptions;
  message: string;
}

export interface SlackActionParams {
  message: string;
}

export interface WebhookActionParams {
  body?: string;
}
