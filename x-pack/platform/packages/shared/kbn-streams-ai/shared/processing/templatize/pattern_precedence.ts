/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';

export const TOKEN_SPLIT_CHARS = [':', '|', ',', ';', '.', '-', '.', '@', '/', '\\', '[', ']', ' '];

const sanitize = (s: string) => s.replace(/[\\.\\^\\$\\*\\+\\?\\(\\)\\[\\]\\{\\\\\|]/, '(\\$&)');
export const PATTERN_OVERRIDES: Record<string, string> = {
  CAPTUREGROUP: '(%{\\d+})',
  // override potentially catastrophic unixpath regex
  UNIXPATH: '^/(?:[w_%!$@:.,+~-]|\\.)+(?:/(?:[w_%!$@:.,+~-]|\\.)+)*$',
  SPLITCHARS: `(${TOKEN_SPLIT_CHARS.map((val) => sanitize(val)).join('|')}){1}`,
};

export const PATTERN_PRECEDENCE = [
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
  'PATH',
  'TTY',
  'WINPATH',
  'URI',
  'DATE_US',
  'DATE_EU',
  'TIMESTAMP_ISO8601',
  'DATE',
  'DATESTAMP',
  'DATESTAMP_RFC822',
  'DATESTAMP_RFC2822',
  'DATESTAMP_OTHER',
  'DATESTAMP_EVENTLOG',
  'SYSLOGTIMESTAMP',
  'SYSLOGPROG',
  'SYSLOGHOST',
  'SYSLOGFACILITY',
  'HTTPDATE',
  'EMAILADDRESS',
  'SYSLOGBASE',
  'MONTH',
  'UNIXPATH',
  'INT',
  'SPLITCHARS',
  'WORD',
  'SPACE',
  'NOTSPACE',
  'GREEDYDATA',
  'DATA',
  // nothing else
];

export const COLLAPSIBLE_PATTERNS = ['NOTSPACE', 'DATA', 'GREEDYDATA'];
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
  'HOSTPORT',
  'TTY',
  'URI',
  'DATE_US',
  'DATE_EU',
  'DATE_US',
  'DATE_EU',
  'TIMESTAMP_ISO8601',
  'DATE',
  'DATESTAMP',
  'DATESTAMP_RFC822',
  'DATESTAMP_RFC2822',
  'DATESTAMP_OTHER',
  'DATESTAMP_EVENTLOG',
  'SYSLOGTIMESTAMP',
];

export const FIRST_PASS_PATTERNS = orderBy(unsortedFirstPassPatterns, (pattern) => {
  const idx = PATTERN_PRECEDENCE.indexOf(pattern);
  return idx === -1 ? Number.POSITIVE_INFINITY : idx;
});
