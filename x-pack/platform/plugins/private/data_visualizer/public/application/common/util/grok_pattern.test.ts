/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFieldsFromGrokPattern, replaceFieldInGrokPattern } from './grok_pattern';

const GROK_PATTERN =
  '<%{INT:field}>%{INT:field2}: .*?: %{SYSLOGTIMESTAMP:timestamp}.*?: %.*?: .*? .*? .*? .*?%{IP:ipaddress}/%{INT:field3}, .*? .*?%{IP:ipaddress2}, .*?/%{BASE16NUM:field5} .*?/%{INT:field4}/%{NUMBER:field6}.*';
const APACHE_LOG_PATTERN = '%{COMBINEDAPACHELOG}';

describe('grok pattern', () => {
  it('should return the correct fields for normal grok pattern', () => {
    const expectedFields = [
      { name: 'field', type: 'INT' },
      { name: 'field2', type: 'INT' },
      { name: 'timestamp', type: 'SYSLOGTIMESTAMP' },
      { name: 'ipaddress', type: 'IP' },
      { name: 'field3', type: 'INT' },
      { name: 'ipaddress2', type: 'IP' },
      { name: 'field5', type: 'BASE16NUM' },
      { name: 'field4', type: 'INT' },
      { name: 'field6', type: 'NUMBER' },
    ];
    const fields = getFieldsFromGrokPattern(GROK_PATTERN);
    expect(fields).toEqual(expectedFields);
  });

  it('should return no fields for apache grok pattern', () => {
    const fields = getFieldsFromGrokPattern(APACHE_LOG_PATTERN);
    expect(fields).toEqual([]);
  });

  it('should rename the correct field', () => {
    const index = 1;
    const renamedField = 'field2_renamed';

    const expectedGrokPattern = `<%{INT:field}>%{INT:${renamedField}}: .*?: %{SYSLOGTIMESTAMP:timestamp}.*?: %.*?: .*? .*? .*? .*?%{IP:ipaddress}/%{INT:field3}, .*? .*?%{IP:ipaddress2}, .*?/%{BASE16NUM:field5} .*?/%{INT:field4}/%{NUMBER:field6}.*`;

    const grokPattern = replaceFieldInGrokPattern(GROK_PATTERN, renamedField, index);
    expect(grokPattern).toEqual(expectedGrokPattern);
  });

  it('should not rename the field if incorrect index is supplied', () => {
    const index = 2; // wrong index
    const renamedField = 'field2_renamed';

    const expectedGrokPattern = `<%{INT:field}>%{INT:${renamedField}}: .*?: %{SYSLOGTIMESTAMP:timestamp}.*?: %.*?: .*? .*? .*? .*?%{IP:ipaddress}/%{INT:field3}, .*? .*?%{IP:ipaddress2}, .*?/%{BASE16NUM:field5} .*?/%{INT:field4}/%{NUMBER:field6}.*`;

    const grokPattern = replaceFieldInGrokPattern(GROK_PATTERN, renamedField, index);
    expect(grokPattern).not.toEqual(expectedGrokPattern);
  });

  it('should not rename apache grok fields', () => {
    const index = 1;
    const renamedField = 'field2_renamed';

    const expectedGrokPattern = APACHE_LOG_PATTERN;

    const grokPattern = replaceFieldInGrokPattern(APACHE_LOG_PATTERN, renamedField, index);
    expect(grokPattern).toEqual(expectedGrokPattern);
  });
});
