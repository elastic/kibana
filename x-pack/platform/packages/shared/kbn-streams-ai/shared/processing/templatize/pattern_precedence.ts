/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';
import { ALL_CAPTURE_CHARS } from './split_on_capture_chars';

const sanitize = (s: string) => s.replaceAll(/[.^$*+?()\[\]{}|\\]/g, '\\$&');

// ^ , $ , \ , . , * , + , ? , ( , ) , [ , ] , { , } , and |
const TOKEN_SPLIT_CHARS = [
  ':',
  '|',
  ',',
  ';',
  '.',
  '-',
  '.',
  '@',
  '/',
  '\\',
  ...ALL_CAPTURE_CHARS,
  ' ',
];

const SPLIT_CHARS_REGEXES = Object.fromEntries(
  TOKEN_SPLIT_CHARS.map((token) => {
    return [token, `(${[token].map((val) => sanitize(val)).join('|')})`];
  })
);

const PATTERN_OVERRIDES: Record<string, string> = {
  CAPTUREGROUP: '(%\\{[A-Za-z0-9_]+:\\d+\\})',
  ...SPLIT_CHARS_REGEXES,
};

const PATTERN_PRECEDENCE = [
  'LOGLEVEL',
  'UUID',
  'URN',
  'MAC',
  'CISCOMAC',
  'WINDOWSMAC',
  'COMMONMAC',
  'IPV6',
  'IPV4',
  'IP',
  'HOSTPORT',
  // 'PATH',
  'TTY',
  'WINPATH',
  // 'URI',
  'TIMESTAMP_ISO8601',
  'DATESTAMP',
  'DATESTAMP_RFC822',
  'DATESTAMP_RFC2822',
  'DATESTAMP_OTHER',
  'DATESTAMP_EVENTLOG',
  'DATE_US',
  'DATE_EU',
  'DATE',
  'SYSLOGTIMESTAMP',
  'SYSLOGFACILITY',
  'HTTPDATE',
  'EMAILADDRESS',
  'SYSLOGBASE',
  'MONTH',
  'MONTHDAY',
  'MONTHNUM',
  'MONTHNUM2',
  'TIME',
  // 'UNIXPATH',
  'INT',
  // 'HOSTNAME',
  ...TOKEN_SPLIT_CHARS,
  'WORD',
  'SPACE',
  'NOTSPACE',
  'DATA',
  'GREEDYDATA',
  // nothing else
];

const COLLAPSIBLE_PATTERNS = ['NOTSPACE', 'DATA', 'GREEDYDATA'];
const unsortedFirstPassPatterns = [
  'TIMESTAMP_ISO8601',
  'IPV4',
  'IPV6',
  'IP',
  'UUID',
  'URN',
  'MAC',
  'CISCOMAC',
  'WINDOWSMAC',
  'COMMONMAC',
  'TTY',
  'TIMESTAMP_ISO8601',
  'SYSLOGTIMESTAMP',
];

const FIRST_PASS_PATTERNS = orderBy(unsortedFirstPassPatterns, (pattern) => {
  const idx = PATTERN_PRECEDENCE.indexOf(pattern);
  return idx === -1 ? Number.POSITIVE_INFINITY : idx;
});

export {
  TOKEN_SPLIT_CHARS,
  COLLAPSIBLE_PATTERNS,
  FIRST_PASS_PATTERNS,
  PATTERN_OVERRIDES,
  PATTERN_PRECEDENCE,
};
