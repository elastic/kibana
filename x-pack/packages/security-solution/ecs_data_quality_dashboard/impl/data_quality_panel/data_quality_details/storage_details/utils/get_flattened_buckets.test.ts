/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertIndexWithAllResults } from '../../../mock/pattern_rollup/mock_alerts_pattern_rollup';
import { auditbeatWithAllResults } from '../../../mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import { packetbeatNoResults } from '../../../mock/pattern_rollup/mock_packetbeat_pattern_rollup';
import { PatternRollup } from '../../../types';
import { getFlattenedBuckets } from './get_flattened_buckets';

const ilmPhases = ['hot', 'warm', 'unmanaged'];
const patternRollups: Record<string, PatternRollup> = {
  '.alerts-security.alerts-default': alertIndexWithAllResults,
  'auditbeat-*': auditbeatWithAllResults,
  'packetbeat-*': packetbeatNoResults,
};

describe('getFlattenedBuckets', () => {
  test('it returns the expected flattened buckets', () => {
    expect(
      getFlattenedBuckets({
        ilmPhases,
        isILMAvailable: true,
        patternRollups,
      })
    ).toEqual([
      {
        ilmPhase: 'hot',
        incompatible: 0,
        indexName: '.internal.alerts-security.alerts-default-000001',
        pattern: '.alerts-security.alerts-default',
        sizeInBytes: 0,
        docsCount: 26093,
      },
      {
        ilmPhase: 'hot',
        incompatible: 0,
        indexName: '.ds-auditbeat-8.6.1-2023.02.07-000001',
        pattern: 'auditbeat-*',
        sizeInBytes: 18791790,
        docsCount: 19123,
      },
      {
        ilmPhase: 'unmanaged',
        incompatible: 1,
        indexName: 'auditbeat-custom-empty-index-1',
        pattern: 'auditbeat-*',
        sizeInBytes: 247,
        docsCount: 0,
      },
      {
        ilmPhase: 'unmanaged',
        incompatible: 3,
        indexName: 'auditbeat-custom-index-1',
        pattern: 'auditbeat-*',
        sizeInBytes: 28409,
        docsCount: 4,
      },
      {
        ilmPhase: 'hot',
        indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
        pattern: 'packetbeat-*',
        sizeInBytes: 512194751,
        docsCount: 1628343,
      },
      {
        ilmPhase: 'hot',
        indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
        pattern: 'packetbeat-*',
        sizeInBytes: 584326147,
        docsCount: 1630289,
      },
    ]);
  });

  test('it returns the expected flattened buckets when isILMAvailable is false', () => {
    expect(
      getFlattenedBuckets({
        ilmPhases,
        isILMAvailable: false,
        patternRollups,
      })
    ).toEqual([
      {
        docsCount: 26093,
        ilmPhase: undefined,
        incompatible: 0,
        indexName: '.internal.alerts-security.alerts-default-000001',
        pattern: '.alerts-security.alerts-default',
        sizeInBytes: 0,
      },
      {
        docsCount: 19123,
        ilmPhase: undefined,
        incompatible: 0,
        indexName: '.ds-auditbeat-8.6.1-2023.02.07-000001',
        pattern: 'auditbeat-*',
        sizeInBytes: 18791790,
      },
      {
        docsCount: 0,
        ilmPhase: undefined,
        incompatible: 1,
        indexName: 'auditbeat-custom-empty-index-1',
        pattern: 'auditbeat-*',
        sizeInBytes: 247,
      },
      {
        docsCount: 4,
        ilmPhase: undefined,
        incompatible: 3,
        indexName: 'auditbeat-custom-index-1',
        pattern: 'auditbeat-*',
        sizeInBytes: 28409,
      },
      {
        docsCount: 1628343,
        ilmPhase: undefined,
        indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
        pattern: 'packetbeat-*',
        sizeInBytes: 512194751,
      },
      {
        docsCount: 1630289,
        ilmPhase: undefined,
        indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
        pattern: 'packetbeat-*',
        sizeInBytes: 584326147,
      },
    ]);
  });
});
