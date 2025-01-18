/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const KV_EXAMPLE_ANSWER = {
  field_split: ' (?=[a-zA-Z][a-zA-Z0-9]*=)',
  value_split: ':',
  trim_value: ' ',
  trim_key: ' ',
  ignore_missing: true,
};

export const KV_HEADER_EXAMPLE_ANSWER = {
  rfc: 'RFC2454',
  regex:
    '/(?:(d{4}[-]d{2}[-]d{2}[T]d{2}[:]d{2}[:]d{2}(?:.d{1,6})?(?:[+-]d{2}[:]d{2}|Z)?)|-)s(?:([w][wd.@-]*)|-)s(.*)$/',
  grok_pattern:
    '%{WORD:cisco.audit.key1}:%{WORD:cisco.audit.value1};%{WORD:cisco.audit.key2}:%{WORD:cisco.audit.value2}:%{GREEDYDATA:message}',
};

export const KV_HEADER_ERROR_EXAMPLE_ANSWER = {
  grok_pattern:
    '%{TIMESTAMP:cisco.audit.timestamp}:%{WORD:cisco.audit.value1};%{WORD:cisco.audit.key2}:%{WORD:cisco.audit.value2}:%{GREEDYDATA:message}',
};

export const COMMON_ERRORS = [
  {
    error: 'field [message] does not contain value_split [=]',
    reason:
      "The error is caused when the processor is trying to split the key-value pairs in the message using 'value_split' regex pattern",
    action:
      "Check the 'field_split' regex pattern and make sure any special characters like whitespaces , url etc., are accounted for",
  },
];
