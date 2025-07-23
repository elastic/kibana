/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';
import { ALL_CAPTURE_CHARS } from './split_on_capture_chars';

// ^ , $ , \ , . , * , + , ? , ( , ) , [ , ] , { , } , and |
export const TOKEN_SPLIT_CHARS = [
  ':',
  '|',
  ',',
  ';',
  '.',
  '-',
  // '_',
  '@',
  '/',
  '\\',
  ...ALL_CAPTURE_CHARS,
  ' ',
];

const sanitize = (s: string) => s.replaceAll(/[.^$*+?()\[\]{}|\\]/g, '\\$&');

const splitCharsRegexes = Object.fromEntries(
  TOKEN_SPLIT_CHARS.map((token) => {
    return [token, `(${[token].map((val) => sanitize(val)).join('|')})`];
  })
);

export const PATTERN_OVERRIDES: Record<string, string> = {
  CAPTUREGROUP: '(%\\{[A-Za-z0-9_]+:\\d+\\})',
  ...splitCharsRegexes,
};

export const PATTERN_PRECEDENCE = [
  'LOGLEVEL',
  'UUID',
  'URN',
  'CISCOMAC', // also matched by `MAC` but prefer specificity
  'WINDOWSMAC', // also matched by `MAC` but prefer specificity
  'COMMONMAC', // also matched by `MAC` but prefer specificity
  'MAC',
  'IPV4', // matched by `IP` but prefer specificity
  'IPV6', // matched by `IP` but prefer specificity
  'IP',
  'HOSTPORT',
  // 'UNIXPATH', // matched by `PATH`
  // 'WINPATH', // matched by `PATH`
  // 'PATH',
  'TTY',
  // 'URI',
  'TIMESTAMP_ISO8601',
  'DATESTAMP',
  'DATESTAMP_RFC822',
  'DATESTAMP_RFC2822',
  'DATESTAMP_OTHER',
  'DATESTAMP_EVENTLOG',
  'SYSLOGTIMESTAMP',
  'SYSLOGFACILITY',
  'HTTPDATE',
  'EMAILADDRESS',
  'DAY',
  'MONTH',
  'TIME',
  'DATE_US', // also matched by `DATE` but prefer specificity
  'DATE_EU', // also matched by `DATE` but prefer specificity
  'DATE',
  // 'MONTHNUM2', // too short, not useful
  // 'MONTHNUM', // too short, not useful
  // 'MONTHDAY', // too short, not useful
  // 'YEAR', // too short, not useful
  'INT',
  // 'HOSTNAME',
  ...TOKEN_SPLIT_CHARS,
  'SPACE',
  'WORD',
  'NOTSPACE',
  'DATA',
  'GREEDYDATA',
  // nothing else
];

export const COLLAPSIBLE_PATTERNS = ['WORD', 'NOTSPACE', 'DATA', 'GREEDYDATA'];

const unsortedFirstPassPatterns = [
  'DATESTAMP_EVENTLOG',
  'DATESTAMP_OTHER',
  'DATESTAMP_RFC2822',
  'DATESTAMP_RFC822',
  'HTTPDATE',
  'IP',
  'MAC',
  'SYSLOGTIMESTAMP',
  'TIMESTAMP_ISO8601',
  'TTY',
  'URN',
  'UUID',
];

export const FIRST_PASS_PATTERNS = orderBy(unsortedFirstPassPatterns, (pattern) => {
  const idx = PATTERN_PRECEDENCE.indexOf(pattern);
  return idx === -1 ? Number.POSITIVE_INFINITY : idx;
});
