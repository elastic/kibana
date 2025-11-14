/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractDissectPatternDangerouslySlow } from './extract_dissect_pattern';
import { findDelimiterSequences } from './find_delimiter_sequences';
import { buildDelimiterTree } from './build_delimiter_tree';
import { extractFields } from './extract_fields';

describe('Debug broken pattern', () => {
  it('debugs the broken pattern case', () => {
    const logs = [
      '- 1763058798 2005.11.09 en257 Nov 9 12:01:01 en257/en257 crond[8951]: (root) CMD (run-parts /etc/cron.hourly)',
      '- 1763058798 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond[2918]: (root) CMD (run-parts /etc/cron.hourly)',
      '- 1763058798 2005.11.09 dn73 Nov 9 12:01:01 dn73/dn73 crond(pam_unix)[2917]: session closed for user root',
    ];

    // eslint-disable-next-line no-console
    console.log('\n=== STEP 1: Find Delimiters ===');
    const delimiters = findDelimiterSequences(logs);
    // eslint-disable-next-line no-console
    console.log('Delimiters found:', delimiters);
    // eslint-disable-next-line no-console
    console.log('Delimiter count:', delimiters.length);

    // eslint-disable-next-line no-console
    console.log('\n=== STEP 2: Build Delimiter Tree ===');
    const delimiterTree = buildDelimiterTree(logs, delimiters);
    // eslint-disable-next-line no-console
    console.log('Delimiter tree:');
    delimiterTree.forEach((node, idx) => {
      // eslint-disable-next-line no-console
      console.log(
        `  ${idx}: "${node.literal}" at positions [${node.positions.join(', ')}], median=${
          node.medianPosition
        }`
      );
    });

    // eslint-disable-next-line no-console
    console.log('\n=== STEP 3: Extract Fields ===');
    const fields = extractFields(logs, delimiterTree);
    // eslint-disable-next-line no-console
    console.log('Fields extracted:', fields.length);
    fields.forEach((field) => {
      // eslint-disable-next-line no-console
      console.log(`  ${field.name}: position=${field.position}`);
      // eslint-disable-next-line no-console
      console.log(`    values: [${field.values.map((v) => `"${v}"`).join(', ')}]`);
    });

    // eslint-disable-next-line no-console
    console.log('\n=== FINAL RESULT ===');
    const result = extractDissectPatternDangerouslySlow(logs);
    // eslint-disable-next-line no-console
    console.log('Pattern:', result.pattern);
    // eslint-disable-next-line no-console
    console.log('Number of fields:', result.fields.length);
    // eslint-disable-next-line no-console
    console.log('\nFinal fields:');
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

    // Let's see what's actually happening
    expect(result.pattern).toBeDefined();
  });
});
