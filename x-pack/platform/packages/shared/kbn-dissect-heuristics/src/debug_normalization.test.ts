/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import { extractDissectPatternDangerouslySlow } from './extract_dissect_pattern';

describe('analyze failing tests - old vs new', () => {
  it('REGRESSION: handles mixed modifiers - WITH normalization', () => {
    const logs = [
      'INFO   - - [2024-01-01] Request received',
      'WARN - - [2024-01-02] Request received',
      'ERROR  - - [2024-01-03] Request received',
    ];

    const result = extractDissectPatternDangerouslySlow(logs);
    console.log('\n=== WITH NORMALIZATION ===');
    console.log('Pattern: ' + result.pattern);
    console.log('Fields:');
    result.fields.forEach((f, idx) => {
      console.log(
        `  field_${idx + 1} (pos ${f.position}): [${f.values.map((v) => `"${v}"`).join(', ')}]`
      );
    });
  });

  it('FAILURE 2: handles complex syslog messages with varying structure', () => {
    const logs = [
      '- 1763056455 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond(pam_unix)[4307]: session opened for user root by (uid=0)',
      '- 1763056455 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond[4308]: (root) CMD (run-parts /etc/cron.hourly)',
      '- 1763056455 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond(pam_unix)[2913]: session opened for user root by (uid=0)',
    ];

    const result = extractDissectPatternDangerouslySlow(logs);
    console.log('\n=== FAILURE 2: COMPLEX SYSLOG ===');
    console.log('Sample messages:');
    logs.forEach((l) => console.log(`  "${l}"`));
    console.log(
      '\nOLD expected: %{} %{field_2} %{field_3} %{field_4} %{field_5} %{field_6} %{field_7} %{field_8} %{field_9} %{field_10} %{field_11} %{field_12} %{field_13}'
    );
    console.log('NEW pattern:  ' + result.pattern);
    console.log('\nFields (' + result.fields.length + '):');
    result.fields.forEach((f) => {
      console.log(`  ${f.name}: [${f.values.map((v) => `"${v}"`).join(', ')}]`);
    });
  });

  it('FAILURE 3: handles wahtever this is', () => {
    const logs = [
      '- 1763056455 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond(pam_unix)[4307]: session opened for user root by (uid=0)',
      '- 1763056455 2005.11.09 eadmin1 Nov 9 12:01:01 src@eadmin1 crond[4308]: (root) CMD (run-parts /etc/cron.hourly)',
      '- 1763056455 2005.11.09 dn754 Nov 9 12:01:01 dn754/dn754 crond(pam_unix)[2913]: session opened for user root by (uid=0)',
    ];

    const result = extractDissectPatternDangerouslySlow(logs);
    console.log('\n=== FAILURE 3: WAHTEVER THIS IS (same as #2) ===');
    console.log(
      '\nOLD expected: %{} %{field_2} %{field_3} %{field_4} %{field_5} %{field_6} %{field_7} %{field_8} %{field_9} %{field_10} %{field_11} %{field_12} %{field_13}'
    );
    console.log('NEW pattern:  ' + result.pattern);
  });

  it('FAILURE 4: handles this other case', () => {
    const logs = [
      'Nov 13 20:10:41 combo sshd(pam_unix)[11741]: authentication failure; logname= uid=0',
      'Nov 13 20:10:39 combo su(pam_unix)[10583]: session closed for user news',
      'Nov 13 20:10:39 combo logrotate: ALERT exited abnormally with [1]',
    ];

    const result = extractDissectPatternDangerouslySlow(logs);
    console.log('\n=== FAILURE 4: HANDLES THIS OTHER CASE ===');
    console.log('Sample messages:');
    logs.forEach((l) => console.log(`  "${l}"`));
    console.log(
      '\nOLD expected: %{field_1} %{field_2} %{field_3} %{field_4} %{field_5}: %{field_6}'
    );
    console.log('NEW pattern:  ' + result.pattern);
    console.log('\nFields (' + result.fields.length + '):');
    result.fields.forEach((f) => {
      console.log(`  ${f.name}: [${f.values.map((v) => `"${v}"`).join(', ')}]`);
    });
  });
});
