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

export const KV_HEADER_EXAMPLE_LOGS = [
  {
    example:
      '[18/Feb/2025:22:39:16 +0000] CONNECT conn=20597223 from=10.1.1.1:1234 to=10.2.3.4:4389 protocol=LDAP',
    header: '[18/Feb/2025:22:39:16 +0000] CONNECT',
    structuredBody: 'conn=20597223 from=10.1.1.1:1234 to=10.2.3.4:4389 protocol=LDAP',
    grok_pattern:
      '[%{HTTPDATE:`{packageName}.{dataStreamName}.`timestamp}] %{WORD:`{packageName}.{dataStreamName}`action}s%{GREEDYDATA:message}',
  },
  {
    example:
      '2021-10-22 22:12:09,871 DEBUG [org.keycloak.events] (default task-3) operationType=CREATE, realmId=test, clientId=abcdefgh userId=sdfsf-b89c-4fca-9088-sdfsfsf, ipAddress=10.1.1.1, resourceType=USER, resourcePath=users/07972d16-b173-4c99-803d-90f211080f40',
    header: '2021-10-22 22:12:09,871 DEBUG [org.keycloak.events] (default task-3)',
    structuredBody:
      'operationType=CREATE, realmId=test, clientId=7bcaf1cb-820a-40f1-91dd-75ced03ef03b, userId=ce637d23-b89c-4fca-9088-1aea1d053e19, ipAddress=10.1.1.1, resourceType=USER, resourcePath=users/07972d16-b173-4c99-803d-90f211080f40',
    grok_pattern:
      '%{TIMESTAMP_ISO8601:`{packageName}.{dataStreamName}.`timestamp} %{LOGLEVEL:`{packageName}.{dataStreamName}`loglevel} [%{DATA:`{packageName}.{dataStreamName}`logsource}] (%{DATA:`{packageName}.{dataStreamName}`task})s%{GREEDYDATA:message}',
  },
];

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
