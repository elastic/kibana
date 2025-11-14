/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findDelimiterSequences } from './find_delimiter_sequences';
import { buildDelimiterTree } from './build_delimiter_tree';
import { extractFields } from './extract_fields';
import { detectModifiers } from './detect_modifiers';
import { generatePattern } from './generate_pattern';

describe('Debug proxy logs step by step', () => {
  it('traces delimiter detection', () => {
    const logs = [
      '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 451 bytes sent, 18846 bytes (18.4 KB) received, lifetime <1 sec',
      '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 close, 1682 bytes (1.64 KB) sent, 472 bytes received, lifetime <1 sec',
      '[11.13 18:56:54] chrome.exe - proxy.cse.cuhk.edu.hk:5070 open through proxy proxy.cse.cuhk.edu.hk:5070 HTTPS',
    ];

    // eslint-disable-next-line no-console
    console.log('\n=== Step 1: Find Delimiters ===');
    const delimiters = findDelimiterSequences(logs);
    // eslint-disable-next-line no-console
    console.log('Delimiters:', delimiters);

    // eslint-disable-next-line no-console
    console.log('\n=== Step 2: Build Tree ===');
    const tree = buildDelimiterTree(logs, delimiters);
    // eslint-disable-next-line no-console
    console.log('Tree count:', tree.length);
    tree.forEach((node, idx) => {
      // eslint-disable-next-line no-console
      console.log(`  ${idx}: "${node.literal}" at median position ${node.medianPosition}`);
    });

    // eslint-disable-next-line no-console
    console.log('\n=== Step 3: Extract Fields ===');
    const fields = extractFields(logs, tree);
    // eslint-disable-next-line no-console
    console.log('Field count:', fields.length);

    fields.forEach((field, idx) => {
      field.modifiers = detectModifiers(field);
      // eslint-disable-next-line no-console
      console.log(
        `  ${idx}: ${field.name} at pos ${field.position}, modifiers=${JSON.stringify(
          field.modifiers
        )}`
      );
      // eslint-disable-next-line no-console
      console.log(`       values: [${field.values.map((v) => `"${v}"`).join(', ')}]`);
    });

    // eslint-disable-next-line no-console
    console.log('\n=== Step 4: Generate Pattern ===');
    const pattern = generatePattern(tree, fields);
    // eslint-disable-next-line no-console
    console.log('Pattern:', pattern);

    expect(pattern).toBeDefined();
  });
});
