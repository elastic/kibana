/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiThemeVars } from '@kbn/ui-theme';

import { getFlattenedBuckets } from '../../utils/get_flattened_buckets';
import { alertIndexWithAllResults } from '../../../../mock/pattern_rollup/mock_alerts_pattern_rollup';
import { auditbeatWithAllResults } from '../../../../mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import { packetbeatNoResults } from '../../../../mock/pattern_rollup/mock_packetbeat_pattern_rollup';
import { PatternRollup } from '../../../../types';
import { getLegendItems, getLegendItemsForPattern, getPatternLegendItem } from './get_legend_items';

const ilmPhases = ['hot', 'warm', 'unmanaged'];
const patterns = ['.alerts-security.alerts-default', 'auditbeat-*', 'packetbeat-*'];
const patternRollups: Record<string, PatternRollup> = {
  '.alerts-security.alerts-default': alertIndexWithAllResults,
  'auditbeat-*': auditbeatWithAllResults,
  'packetbeat-*': packetbeatNoResults,
};

describe('getPatternLegendItem', () => {
  test('it returns the expected legend item', () => {
    const pattern = 'auditbeat-*';

    expect(getPatternLegendItem({ pattern, patternRollups })).toEqual({
      color: null,
      ilmPhase: null,
      index: null,
      pattern,
      sizeInBytes: auditbeatWithAllResults.sizeInBytes,
      docsCount: auditbeatWithAllResults.docsCount,
    });
  });
});

describe('getLegendItemsForPattern', () => {
  test('it returns the expected legend items', () => {
    const pattern = 'auditbeat-*';
    const flattenedBuckets = getFlattenedBuckets({
      ilmPhases,
      isILMAvailable: true,
      patternRollups,
    });

    expect(getLegendItemsForPattern({ pattern, flattenedBuckets })).toEqual([
      {
        color: euiThemeVars.euiColorSuccess,
        ilmPhase: 'hot',
        index: '.ds-auditbeat-8.6.1-2023.02.07-000001',
        pattern: 'auditbeat-*',
        sizeInBytes: 18791790,
        docsCount: 19123,
      },
      {
        color: euiThemeVars.euiColorDanger,
        ilmPhase: 'unmanaged',
        index: 'auditbeat-custom-index-1',
        pattern: 'auditbeat-*',
        sizeInBytes: 28409,
        docsCount: 4,
      },
      {
        color: euiThemeVars.euiColorDanger,
        ilmPhase: 'unmanaged',
        index: 'auditbeat-custom-empty-index-1',
        pattern: 'auditbeat-*',
        sizeInBytes: 247,
        docsCount: 0,
      },
    ]);
  });

  test('it returns the expected legend items when isILMAvailable is false', () => {
    const pattern = 'auditbeat-*';
    const flattenedBuckets = getFlattenedBuckets({
      ilmPhases,
      isILMAvailable: false,
      patternRollups,
    });
    expect(getLegendItemsForPattern({ pattern, flattenedBuckets })).toEqual([
      {
        color: euiThemeVars.euiColorSuccess,
        ilmPhase: null,
        index: '.ds-auditbeat-8.6.1-2023.02.07-000001',
        pattern: 'auditbeat-*',
        sizeInBytes: 18791790,
        docsCount: 19123,
      },
      {
        color: euiThemeVars.euiColorDanger,
        ilmPhase: null,
        index: 'auditbeat-custom-index-1',
        pattern: 'auditbeat-*',
        sizeInBytes: 28409,
        docsCount: 4,
      },
      {
        color: euiThemeVars.euiColorDanger,
        ilmPhase: null,
        index: 'auditbeat-custom-empty-index-1',
        pattern: 'auditbeat-*',
        sizeInBytes: 247,
        docsCount: 0,
      },
    ]);
  });
});

describe('getLegendItems', () => {
  test('it returns the expected legend items', () => {
    const flattenedBuckets = getFlattenedBuckets({
      ilmPhases,
      isILMAvailable: true,
      patternRollups,
    });

    expect(getLegendItems({ flattenedBuckets, patterns, patternRollups })).toEqual([
      {
        color: null,
        ilmPhase: null,
        index: null,
        pattern: '.alerts-security.alerts-default',
        sizeInBytes: 29717961631,
        docsCount: 26093,
      },
      {
        color: euiThemeVars.euiColorSuccess,
        ilmPhase: 'hot',
        index: '.internal.alerts-security.alerts-default-000001',
        pattern: '.alerts-security.alerts-default',
        sizeInBytes: 0,
        docsCount: 26093,
      },
      {
        color: null,
        ilmPhase: null,
        index: null,
        pattern: 'auditbeat-*',
        sizeInBytes: 18820446,
        docsCount: 19127,
      },
      {
        color: euiThemeVars.euiColorSuccess,
        ilmPhase: 'hot',
        index: '.ds-auditbeat-8.6.1-2023.02.07-000001',
        pattern: 'auditbeat-*',
        sizeInBytes: 18791790,
        docsCount: 19123,
      },
      {
        color: euiThemeVars.euiColorDanger,
        ilmPhase: 'unmanaged',
        index: 'auditbeat-custom-index-1',
        pattern: 'auditbeat-*',
        sizeInBytes: 28409,
        docsCount: 4,
      },
      {
        color: euiThemeVars.euiColorDanger,
        ilmPhase: 'unmanaged',
        index: 'auditbeat-custom-empty-index-1',
        pattern: 'auditbeat-*',
        sizeInBytes: 247,
        docsCount: 0,
      },
      {
        color: null,
        ilmPhase: null,
        index: null,
        pattern: 'packetbeat-*',
        sizeInBytes: 1096520898,
        docsCount: 3258632,
      },
      {
        color: euiThemeVars.euiColorPrimary,
        ilmPhase: 'hot',
        index: '.ds-packetbeat-8.5.3-2023.02.04-000001',
        pattern: 'packetbeat-*',
        sizeInBytes: 584326147,
        docsCount: 1630289,
      },
      {
        color: euiThemeVars.euiColorPrimary,
        ilmPhase: 'hot',
        index: '.ds-packetbeat-8.6.1-2023.02.04-000001',
        pattern: 'packetbeat-*',
        sizeInBytes: 512194751,
        docsCount: 1628343,
      },
    ]);
  });
});
