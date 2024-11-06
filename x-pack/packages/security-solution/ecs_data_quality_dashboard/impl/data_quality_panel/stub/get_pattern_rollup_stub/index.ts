/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PatternRollup } from '../../types';

const phases = ['hot', 'warm', 'cold', 'frozen'] as const;

/**
 *
 * This function derives ilmExplain, results, stats and ilmExplainPhaseCounts
 * from the provided pattern and indicesCount for the purpose of simplifying
 * stubbing of resultsRollup in tests.
 *
 * @param pattern - The index pattern to simulate. Defaults to `'packetbeat-*'`.
 * @param indicesCount - The number of indices to generate. Defaults to `2`.
 * @param isILMAvailable - Whether ILM is available. Defaults to `true`.
 * @returns An object containing stubbed pattern rollup data
 */
export const getPatternRollupStub = (
  pattern = 'packetbeat-*',
  indicesCount = 2,
  isILMAvailable = true
): PatternRollup => {
  // Derive ilmExplain from isILMAvailable, pattern and indicesCount
  const ilmExplain = isILMAvailable
    ? Object.fromEntries(
        Array.from({ length: indicesCount }).map((_, i) => {
          const indexName = pattern.replace('*', `${i + 1}`);
          const dsIndexName = `.ds-${indexName}`;
          // Cycle through phases
          const phase = phases[i % phases.length];
          return [
            dsIndexName,
            {
              index: dsIndexName,
              managed: true,
              policy: pattern,
              phase,
            },
          ];
        })
      )
    : null;

  // Derive ilmExplainPhaseCounts from ilmExplain
  const ilmExplainPhaseCounts = ilmExplain
    ? phases.reduce(
        (counts, phase) => ({
          ...counts,
          [phase]: Object.values(ilmExplain).filter((explain) => explain.phase === phase).length,
        }),
        { hot: 0, warm: 0, cold: 0, frozen: 0, unmanaged: 0 }
      )
    : undefined;

  // Derive results from pattern and indicesCount
  const results = Object.fromEntries(
    Array.from({ length: indicesCount }, (_, i) => {
      const indexName = pattern.replace('*', `${i + 1}`);
      const dsIndexName = `.ds-${indexName}`;
      return [
        dsIndexName,
        {
          docsCount: 1000000 + i * 100000, // Example doc count
          error: null,
          ilmPhase: ilmExplain?.[dsIndexName].phase,
          incompatible: i,
          indexName: dsIndexName,
          markdownComments: ['foo', 'bar', 'baz'],
          pattern,
          sameFamily: i,
          checkedAt: Date.now(),
        },
      ];
    })
  );

  // Derive stats from isILMAvailable, pattern and indicesCount
  const stats = Object.fromEntries(
    Array.from({ length: indicesCount }, (_, i) => {
      const indexName = pattern.replace('*', `${i + 1}`);
      const dsIndexName = `.ds-${indexName}`;
      return [
        dsIndexName,
        {
          uuid: `uuid-${i + 1}`,
          size_in_bytes: isILMAvailable ? 500000000 + i * 10000000 : null,
          name: dsIndexName,
          num_docs: results[dsIndexName].docsCount,
        },
      ];
    })
  );

  // Derive total docsCount and sizeInBytes from stats
  const totalDocsCount = Object.values(stats).reduce((sum, stat) => sum + stat.num_docs, 0);
  const totalSizeInBytes = isILMAvailable
    ? Object.values(stats).reduce((sum, stat) => sum + (stat.size_in_bytes ?? 0), 0)
    : undefined;

  return {
    docsCount: totalDocsCount,
    error: null,
    pattern,
    ilmExplain,
    ilmExplainPhaseCounts,
    indices: indicesCount,
    results,
    sizeInBytes: totalSizeInBytes,
    stats,
  };
};
