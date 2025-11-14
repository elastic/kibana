/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import { extractDissectPatternDangerouslySlow } from './extract_dissect_pattern';
import { findDelimiterSequences } from './find_delimiter_sequences';
import { buildDelimiterTree } from './build_delimiter_tree';
import { extractFields } from './extract_fields';
import { normalizeWhitespace } from './normalize_whitespace';

describe('Debug test', () => {
  it('shows delimiter detection issue', () => {
    const logs = [
      '[Fri Nov 14 13:14:11 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:14:11 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:14:10 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:14:10 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:14:08 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:14:08 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:14:07 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:14:07 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:14:06 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:14:06 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:14:04 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:14:04 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:14:03 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:14:03 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:14:02 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:14:02 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:14:01 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:14:01 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:59 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:59 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:13:58 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:13:58 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:57 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:13:57 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:55 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:55 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:13:54 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:13:54 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:52 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:52 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:13:51 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:13:51 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:49 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:13:49 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:48 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:13:48 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:47 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:13:47 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:46 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:46 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:13:44 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:13:44 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:43 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:43 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:13:41 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:41 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:13:40 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:13:40 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:39 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:39 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:13:38 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:13:38 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:35 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:34 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:13:34 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:32 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:13:32 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:30 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:13:30 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:29 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:13:27 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:19 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:13:19 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:16 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:15 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:14 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:13:07 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:13:07 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:06 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:13:03 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:13:00 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:12:59 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:12:58 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:12:58 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:12:57 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:12:57 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:12:55 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:12:54 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:12:53 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:12:53 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:12:51 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:12:50 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:12:50 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:12:49 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:12:48 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:12:48 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:12:46 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:12:42 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:12:41 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:12:40 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:12:37 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:12:36 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:12:29 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:12:28 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:12:24 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:12:22 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:12:22 2025] [error] mod_jk child workerEnv in error state 6',
      '[Fri Nov 14 13:12:20 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:12:19 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
      '[Fri Nov 14 13:12:19 2025] [error] mod_jk child workerEnv in error state 6',
    ];

    console.log('\n=== STEP BY STEP DEBUG ===');

    // Step 1: Normalize whitespace
    const normalizedMessages = normalizeWhitespace(logs);
    const normalizedStrings = normalizedMessages.map((nm) => nm.normalized);

    // Step 2: Find delimiters
    const delimiters = findDelimiterSequences(normalizedStrings);
    console.log('\n2. Detected delimiters:', delimiters);

    // Check if ': ' is detected
    if (delimiters.includes(': ')) {
      console.log('   ⚠️  PROBLEM: ": " is detected as a delimiter!');

      // Check which messages have ': ' delimiter
      normalizedStrings.forEach((msg, i) => {
        const count = (msg.match(/: /g) || []).length;
        console.log(`   Message ${i} has ${count} occurrences of ": "`);
      });
    }

    // Step 3: Build delimiter tree
    const delimiterTree = buildDelimiterTree(normalizedStrings, delimiters);
    console.log('\n3. Delimiter tree (ordered by position):');
    delimiterTree.forEach((d) => {
      console.log(`   "${d.literal}" at positions: [${d.positions.join(', ')}]`);
    });

    // Check for ALL ": " delimiter nodes (there can be multiple for multiple occurrences)
    const allColonSpaceNodes = delimiterTree.filter((d) => d.literal === ': ');
    const bracketColonSpace = delimiterTree.find((d) => d.literal === ']: ');

    if (allColonSpaceNodes.length > 0 && bracketColonSpace) {
      console.log('\n   🔍 Analyzing ALL ": " delimiter nodes:');
      console.log(`      Found ${allColonSpaceNodes.length} ": " delimiter nodes`);
      console.log(`      "]: " positions: [${bracketColonSpace.positions.join(', ')}]`);

      allColonSpaceNodes.forEach((colonNode, nodeIdx) => {
        console.log(
          `\n      ": " node #${nodeIdx + 1} at positions: [${colonNode.positions.join(', ')}]`
        );

        // Check if THIS ": " node overlaps with "]: "
        const overlaps = colonNode.positions.filter((pos, idx) => {
          const bracketPos = bracketColonSpace.positions[idx];
          const bracketEnd = bracketPos + bracketColonSpace.literal.length;
          const overlap = pos >= bracketPos && pos < bracketEnd;
          if (overlap) {
            console.log(
              `         Message ${idx}: ": " at ${pos} OVERLAPS with "]: " range [${bracketPos}, ${bracketEnd})`
            );
          }
          return overlap;
        });

        console.log(
          `         Overlaps: ${overlaps.length}/${colonNode.positions.length} messages (${(
            (overlaps.length / colonNode.positions.length) *
            100
          ).toFixed(1)}%)`
        );
        console.log(`         Threshold: ${normalizedStrings.length * 0.3} messages (30%)`);
        console.log(
          `         Should be filtered? ${
            overlaps.length > normalizedStrings.length * 0.3 ? 'YES ✓' : 'NO ✗'
          }`
        );
      });
    }

    // Step 4: Extract fields
    const fields = extractFields(normalizedStrings, delimiterTree);
    console.log('\n4. Extracted fields:');
    fields.forEach((f) => {
      console.log(`   ${f.name}: ["${f.values.join('", "')}"]`);
    });

    console.log('\n===================\n');
  });

  it('investigates why filter does not work', () => {
    const logs = [
      '2025-11-14T12:20:55.709Z INFO: nginx[5526]: Server restarted successfully.',
      '2025-11-14T12:20:55.709Z DEBUG: nginx[4194]: Cache hit for /path-7958700000000009.',
      '2025-11-14T12:20:55.709Z INFO: nginx[3414]: Access log: 34.136.92.88 - - [14/Nov/2025:13:20:55 +01:00] "GET /path-7958700000000015 HTTP/1.1" 224 6585.',
    ];

    console.log('\n=== INVESTIGATING FILTER LOGIC ===');

    const normalizedMessages = normalizeWhitespace(logs);
    const normalizedStrings = normalizedMessages.map((nm) => nm.normalized);

    const delimiters = findDelimiterSequences(normalizedStrings);
    const delimiterTree = buildDelimiterTree(normalizedStrings, delimiters);

    // Find the problematic nodes
    const colonSpaceNodes = delimiterTree.filter((d) => d.literal === ': ');
    const bracketColonSpace = delimiterTree.find((d) => d.literal === ']: ');

    console.log(`\nFound ${colonSpaceNodes.length} ": " nodes in final tree`);
    console.log(`Found ${bracketColonSpace ? 1 : 0} "]: " nodes in final tree`);

    if (colonSpaceNodes.length > 1 && bracketColonSpace) {
      const problematicNode = colonSpaceNodes[1]; // The second one that should be filtered
      console.log('\n🔍 Why was the second ": " node NOT filtered?');
      console.log(`   Node positions: [${problematicNode.positions.join(', ')}]`);
      console.log(
        `   Strong delimiter "]: " positions: [${bracketColonSpace.positions.join(', ')}]`
      );
      console.log(`   Is ": " a substring of "]: "? ${']: '.includes(': ')}`);

      // Manually run the filter logic
      const overlappingMessages = problematicNode.positions.filter((weakPos, idx) => {
        const strongPos = bracketColonSpace.positions[idx];
        const strongEnd = strongPos + bracketColonSpace.literal.length;
        const overlaps = weakPos >= strongPos && weakPos < strongEnd;
        console.log(
          `   Msg ${idx}: weakPos=${weakPos}, strongPos=${strongPos}, strongEnd=${strongEnd}, overlaps=${overlaps}`
        );
        return overlaps;
      }).length;

      console.log(`\n   Overlapping messages: ${overlappingMessages}`);
      console.log(`   Threshold (30%): ${normalizedStrings.length * 0.3}`);
      console.log(`   Should filter: ${overlappingMessages > normalizedStrings.length * 0.3}`);
    }

    console.log('\n===================\n');
  });

  it('investigates with all messages', () => {
    const logs = [
      '11-14 13:14:11.660  1702  2395 D WindowManager: printFreezingDisplayLogsopening app wtoken = AppWindowToken{9f4ef63 token=Token{a64f992 ActivityRecord{de9231d u0 com.tencent.qt.qtl/.activity.info.NewsDetailXmlActivity t761}}}, allDrawn= false, startingDisplayed =  false, startingMoved =  false, isRelaunching =  false',
      '11-14 13:14:10.160  1702  2395 D WindowManager: printFreezingDisplayLogsopening app wtoken = AppWindowToken{9f4ef63 token=Token{a64f992 ActivityRecord{de9231d u0 com.tencent.qt.qtl/.activity.info.NewsDetailXmlActivity t761}}}, allDrawn= false, startingDisplayed =  false, startingMoved =  false, isRelaunching =  false',
      '11-14 13:14:07.460  1702  2395 D WindowManager: printFreezingDisplayLogsopening app wtoken = AppWindowToken{9f4ef63 token=Token{a64f992 ActivityRecord{de9231d u0 com.tencent.qt.qtl/.activity.info.NewsDetailXmlActivity t761}}}, allDrawn= false, startingDisplayed =  false, startingMoved =  false, isRelaunching =  false',
      '11-14 13:14:04.860  1702  2395 D WindowManager: printFreezingDisplayLogsopening app wtoken = AppWindowToken{9f4ef63 token=Token{a64f992 ActivityRecord{de9231d u0 com.tencent.qt.qtl/.activity.info.NewsDetailXmlActivity t761}}}, allDrawn= false, startingDisplayed =  false, startingMoved =  false, isRelaunching =  false',
      '11-14 13:14:02.360  1702  2395 D WindowManager: printFreezingDisplayLogsopening app wtoken = AppWindowToken{9f4ef63 token=Token{a64f992 ActivityRecord{de9231d u0 com.tencent.qt.qtl/.activity.info.NewsDetailXmlActivity t761}}}, allDrawn= false, startingDisplayed =  false, startingMoved =  false, isRelaunching =  false',
      '11-14 13:14:01.060  1702  2395 D WindowManager: printFreezingDisplayLogsopening app wtoken = AppWindowToken{9f4ef63 token=Token{a64f992 ActivityRecord{de9231d u0 com.tencent.qt.qtl/.activity.info.NewsDetailXmlActivity t761}}}, allDrawn= false, startingDisplayed =  false, startingMoved =  false, isRelaunching =  false',
      '11-14 13:13:59.760  1702  2395 D WindowManager: printFreezingDisplayLogsopening app wtoken = AppWindowToken{9f4ef63 token=Token{a64f992 ActivityRecord{de9231d u0 com.tencent.qt.qtl/.activity.info.NewsDetailXmlActivity t761}}}, allDrawn= false, startingDisplayed =  false, startingMoved =  false, isRelaunching =  false',
      '11-14 13:13:58.460  1702  2395 D WindowManager: printFreezingDisplayLogsopening app wtoken = AppWindowToken{9f4ef63 token=Token{a64f992 ActivityRecord{de9231d u0 com.tencent.qt.qtl/.activity.info.NewsDetailXmlActivity t761}}}, allDrawn= false, startingDisplayed =  false, startingMoved =  false, isRelaunching =  false',
      '11-14 13:13:55.660  1702  2395 D WindowManager: printFreezingDisplayLogsopening app wtoken = AppWindowToken{9f4ef63 token=Token{a64f992 ActivityRecord{de9231d u0 com.tencent.qt.qtl/.activity.info.NewsDetailXmlActivity t761}}}, allDrawn= false, startingDisplayed =  false, startingMoved =  false, isRelaunching =  false',
      '11-14 13:13:54.360  1702  2395 D WindowManager: printFreezingDisplayLogsopening app wtoken = AppWindowToken{9f4ef63 token=Token{a64f992 ActivityRecord{de9231d u0 com.tencent.qt.qtl/.activity.info.NewsDetailXmlActivity t761}}}, allDrawn= false, startingDisplayed =  false, startingMoved =  false, isRelaunching =  false',
      '11-14 13:13:52.960  1702  2395 D WindowManager: printFreezingDisplayLogsopening app wtoken = AppWindowToken{9f4ef63 token=Token{a64f992 ActivityRecord{de9231d u0 com.tencent.qt.qtl/.activity.info.NewsDetailXmlActivity t761}}}, allDrawn= false, startingDisplayed =  false, startingMoved =  false, isRelaunching =  false',
      '11-14 13:13:51.460  1702  2395 D WindowManager: printFreezingDisplayLogsopening app wtoken = AppWindowToken{9f4ef63 token=Token{a64f992 ActivityRecord{de9231d u0 com.tencent.qt.qtl/.activity.info.NewsDetailXmlActivity t761}}}, allDrawn= false, startingDisplayed =  false, startingMoved =  false, isRelaunching =  false',
      '11-14 13:13:49.960  1702  2395 D WindowManager: printFreezingDisplayLogsopening app wtoken = AppWindowToken{9f4ef63 token=Token{a64f992 ActivityRecord{de9231d u0 com.tencent.qt.qtl/.activity.info.NewsDetailXmlActivity t761}}}, allDrawn= false, startingDisplayed =  false, startingMoved =  false, isRelaunching =  false',
      '11-14 13:13:48.660  1702  2395 D WindowManager: printFreezingDisplayLogsopening app wtoken = AppWindowToken{9f4ef63 token=Token{a64f992 ActivityRecord{de9231d u0 com.tencent.qt.qtl/.activity.info.NewsDetailXmlActivity t761}}}, allDrawn= false, startingDisplayed =  false, startingMoved =  false, isRelaunching =  false',
      '11-14 13:13:47.360  1702  2395 D WindowManager: printFreezingDisplayLogsopening app wtoken = AppWindowToken{9f4ef63 token=Token{a64f992 ActivityRecord{de9231d u0 com.tencent.qt.qtl/.activity.info.NewsDetailXmlActivity t761}}}, allDrawn= false, startingDisplayed =  false, startingMoved =  false, isRelaunching =  false',
    ];

    const result = extractDissectPatternDangerouslySlow(logs);

    console.log('\n=== DEBUG OUTPUT (ALL MESSAGES) ===');
    console.log('Pattern:', result.pattern);
    console.log('\nFields:');
    result.fields.forEach((f, i) => {
      console.log(`  ${f.name}: modifiers=${JSON.stringify(f.modifiers)}`);
      console.log(`    First 3 values: ["${f.values.slice(0, 3).join('", "')}"]\n`);
    });
    console.log('=====================================\n');

    // Check the actual pattern
    console.log(
      '\nExpected: %{field_1}-%{field_2}-%{field_3} %{field_4}: %{field_5}[%{field_6}]: %{field_7->} %{field_8} %{field_9}'
    );
    console.log('Received:', result.pattern);
  });
});
