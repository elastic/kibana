/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractDissectPatternDangerouslySlow } from './extract_dissect_pattern';

describe('Debug proxy logs', () => {
  it('debugs proxy log pattern', () => {
    const logs = [
      '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 451 bytes sent, 18846 bytes (18.4 KB) received, lifetime <1 sec',
      '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1682 bytes (1.64 KB) sent, 472 bytes received, lifetime <1 sec',
      '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1301 bytes (1.27 KB) sent, 434 bytes received, lifetime <1 sec',
    ];

    const result = extractDissectPatternDangerouslySlow(logs);
    // eslint-disable-next-line no-console
    console.log('\nPattern:', result.pattern);
    // eslint-disable-next-line no-console
    console.log('Field count:', result.fields.length);
    // eslint-disable-next-line no-console
    console.log('\nFields:');
    result.fields.forEach((field) => {
      // eslint-disable-next-line no-console
      console.log(`  ${field.name}: modifiers=${JSON.stringify(field.modifiers)}`);
      // eslint-disable-next-line no-console
      console.log(
        `    values: [${field.values
          .slice(0, 3)
          .map((v) => `"${v}"`)
          .join(', ')}]`
      );
    });

    expect(result.pattern).toBeDefined();
  });
});
