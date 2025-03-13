/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const GROK_EXAMPLE_ANSWER = {
  rfc: 'RFC2454',
  grok_pattern: '%{WORD:key1}:%{WORD:value1};%{WORD:key2}:%{WORD:value2}:%{GREEDYDATA:message}',
};

export const GROK_ERROR_EXAMPLE_ANSWER = {
  grok_pattern:
    '%{TIMESTAMP:timestamp}:%{WORD:value1};%{WORD:key2}:%{WORD:value2}:%{GREEDYDATA:message}',
};
