/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import { extractDissectPatternDangerouslySlow } from './extract_dissect_pattern';
import { normalizeWhitespace } from './normalize_whitespace';
import { findDelimiterSequences } from './find_delimiter_sequences';
import { buildDelimiterTree } from './build_delimiter_tree';
import { extractFields } from './extract_fields';

describe('debug mixed modifiers failure', () => {
  it('step by step analysis WITH normalization', () => {
    const logs = [
      'INFO   - - [2024-01-01] Request received',
      'WARN - - [2024-01-02] Request received',
      'ERROR  - - [2024-01-03] Request received',
    ];

    console.log('\n=== ORIGINAL MESSAGES ===');
    logs.forEach((log, idx) => {
      console.log(`${idx}: "${log}"`);
      const positions = log
        .split('')
        .map((c, i) => `${i}:${c === ' ' ? '_' : c}`)
        .join(' ');
      console.log(`   ${positions}`);
    });

    // STEP 0: Normalize whitespace
    const normalized = normalizeWhitespace(logs);
    console.log('\n=== STEP 0: AFTER WHITESPACE NORMALIZATION ===');
    normalized.forEach((nm, idx) => {
      console.log(`  ${idx}: "${nm.normalized}"`);
      console.log(`     Collapsed positions: [${nm.collapsedWhitespacePositions.join(', ')}]`);
    });

    // Get normalized strings
    const normalizedStrings = normalized.map((nm) => nm.normalized);

    // Step 1: Find delimiters
    const delimiters = findDelimiterSequences(normalizedStrings);
    console.log('\n=== STEP 1: DELIMITERS FOUND (on normalized) ===');
    delimiters.forEach((d, i) => {
      console.log(`  ${i}: "${d}"`);
    });

    // Step 2: Build tree
    const tree = buildDelimiterTree(normalizedStrings, delimiters);
    console.log('\n=== STEP 2: DELIMITER TREE (on normalized) ===');
    tree.forEach((node, i) => {
      console.log(`  Node ${i}: "${node.literal}" at positions [${node.positions.join(', ')}]`);
      // Show what's at those positions in each message
      node.positions.forEach((pos, msgIdx) => {
        const snippet = normalizedStrings[msgIdx].substring(pos - 2, pos + node.literal.length + 2);
        console.log(`    Msg ${msgIdx} pos ${pos}: "...${snippet}..."`);
      });
    });

    // Step 3: Extract fields
    const fields = extractFields(normalizedStrings, tree);
    console.log('\n=== STEP 3: FIELDS EXTRACTED (from normalized) ===');
    fields.forEach((f, idx) => {
      console.log(`  Field ${idx + 1} (pos ${f.position}):`);
      f.values.forEach((v, msgIdx) => {
        console.log(`    Msg ${msgIdx}: "${v}"`);
      });
    });

    // Step 4: Full result
    const result = extractDissectPatternDangerouslySlow(logs);
    console.log('\n=== FINAL PATTERN ===');
    console.log(
      `  Expected: %{field_1} %{field_2->} - - [%{field_3} %{field_4} %{field_5} %{field_6->}] %{field_7->} %{field_8}`
    );
    console.log(`  Actual:   ${result.pattern}`);
    console.log(`  Fields: ${result.fields.length} (expected 8)`);
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
