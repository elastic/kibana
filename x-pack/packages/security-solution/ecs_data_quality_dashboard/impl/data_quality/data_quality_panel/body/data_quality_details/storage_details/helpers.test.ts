/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { euiThemeVars } from '@kbn/ui-theme';

import { EMPTY_STAT } from '../../../../helpers';
import {
  DEFAULT_INDEX_COLOR,
  getFillColor,
  getFlattenedBuckets,
  getGroupFromPath,
  getLayersMultiDimensional,
  getLegendItems,
  getLegendItemsForPattern,
  getPathToFlattenedBucketMap,
  getPatternLegendItem,
  getPatternSizeInBytes,
} from './helpers';
import { alertIndexWithAllResults } from '../../../../mock/pattern_rollup/mock_alerts_pattern_rollup';
import { auditbeatWithAllResults } from '../../../../mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import { packetbeatNoResults } from '../../../../mock/pattern_rollup/mock_packetbeat_pattern_rollup';
import { PatternRollup } from '../../../../types';

const defaultBytesFormat = '0,0.[0]b';
const formatBytes = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

const ilmPhases = ['hot', 'warm', 'unmanaged'];
const patterns = ['.alerts-security.alerts-default', 'auditbeat-*', 'packetbeat-*'];

const patternRollups: Record<string, PatternRollup> = {
  '.alerts-security.alerts-default': alertIndexWithAllResults,
  'auditbeat-*': auditbeatWithAllResults,
  'packetbeat-*': packetbeatNoResults,
};

/** a valid `PatternRollup` that has an undefined `sizeInBytes` */
const noSizeInBytes: Record<string, PatternRollup> = {
  'valid-*': {
    docsCount: 19127,
    error: null,
    ilmExplain: null,
    ilmExplainPhaseCounts: {
      hot: 1,
      warm: 0,
      cold: 0,
      frozen: 0,
      unmanaged: 2,
    },
    indices: 3,
    pattern: 'valid-*',
    results: undefined,
    sizeInBytes: undefined, // <--
    stats: null,
  },
};

describe('helpers', () => {
  describe('getPatternSizeInBytes', () => {
    test('it returns the expected size when the pattern exists in the rollup', () => {
      const pattern = 'auditbeat-*';

      expect(getPatternSizeInBytes({ pattern, patternRollups })).toEqual(
        auditbeatWithAllResults.sizeInBytes
      );
    });

    test('it returns undefined when the pattern exists in the rollup, but does not have a sizeInBytes', () => {
      const pattern = 'valid-*';

      expect(getPatternSizeInBytes({ pattern, patternRollups: noSizeInBytes })).toBeUndefined();
    });

    test('it returns undefined when the pattern does NOT exist in the rollup', () => {
      const pattern = 'does-not-exist-*';

      expect(getPatternSizeInBytes({ pattern, patternRollups })).toBeUndefined();
    });
  });

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

  describe('getFillColor', () => {
    test('it returns success when `incompatible` is zero', () => {
      const incompatible = 0;

      expect(getFillColor(incompatible)).toEqual(euiThemeVars.euiColorSuccess);
    });

    test('it returns danger when `incompatible` is greater than 0', () => {
      const incompatible = 1;

      expect(getFillColor(incompatible)).toEqual(euiThemeVars.euiColorDanger);
    });

    test('it returns the default color when `incompatible` is undefined', () => {
      const incompatible = undefined;

      expect(getFillColor(incompatible)).toEqual(DEFAULT_INDEX_COLOR);
    });
  });

  describe('getPathToFlattenedBucketMap', () => {
    test('it returns the expected map', () => {
      const flattenedBuckets = getFlattenedBuckets({
        ilmPhases,
        isILMAvailable: true,
        patternRollups,
      });

      expect(getPathToFlattenedBucketMap(flattenedBuckets)).toEqual({
        '.alerts-security.alerts-default.internal.alerts-security.alerts-default-000001': {
          pattern: '.alerts-security.alerts-default',
          indexName: '.internal.alerts-security.alerts-default-000001',
          ilmPhase: 'hot',
          incompatible: 0,
          sizeInBytes: 0,
          docsCount: 26093,
        },
        'auditbeat-*.ds-auditbeat-8.6.1-2023.02.07-000001': {
          pattern: 'auditbeat-*',
          indexName: '.ds-auditbeat-8.6.1-2023.02.07-000001',
          ilmPhase: 'hot',
          incompatible: 0,
          sizeInBytes: 18791790,
          docsCount: 19123,
        },
        'auditbeat-*auditbeat-custom-empty-index-1': {
          pattern: 'auditbeat-*',
          indexName: 'auditbeat-custom-empty-index-1',
          ilmPhase: 'unmanaged',
          incompatible: 1,
          sizeInBytes: 247,
          docsCount: 0,
        },
        'auditbeat-*auditbeat-custom-index-1': {
          pattern: 'auditbeat-*',
          indexName: 'auditbeat-custom-index-1',
          ilmPhase: 'unmanaged',
          incompatible: 3,
          sizeInBytes: 28409,
          docsCount: 4,
        },
        'packetbeat-*.ds-packetbeat-8.6.1-2023.02.04-000001': {
          pattern: 'packetbeat-*',
          indexName: '.ds-packetbeat-8.6.1-2023.02.04-000001',
          ilmPhase: 'hot',
          sizeInBytes: 512194751,
          docsCount: 1628343,
        },
        'packetbeat-*.ds-packetbeat-8.5.3-2023.02.04-000001': {
          docsCount: 1630289,
          pattern: 'packetbeat-*',
          indexName: '.ds-packetbeat-8.5.3-2023.02.04-000001',
          ilmPhase: 'hot',
          sizeInBytes: 584326147,
        },
      });
    });
  });

  describe('getGroupFromPath', () => {
    it('returns the expected group from the path', () => {
      expect(
        getGroupFromPath([
          {
            index: 0,
            value: '__null_small_multiples_key__',
          },
          {
            index: 0,
            value: '__root_key__',
          },
          {
            index: 0,
            value: 'auditbeat-*',
          },
          {
            index: 1,
            value: 'auditbeat-custom-empty-index-1',
          },
        ])
      ).toEqual('auditbeat-*');
    });

    it('returns undefined when path is an empty array', () => {
      expect(getGroupFromPath([])).toBeUndefined();
    });

    it('returns undefined when path is an array with only one value', () => {
      expect(
        getGroupFromPath([{ index: 0, value: '__null_small_multiples_key__' }])
      ).toBeUndefined();
    });
  });

  describe('getLayersMultiDimensional', () => {
    const layer0FillColor = 'transparent';
    const flattenedBuckets = getFlattenedBuckets({
      ilmPhases,
      isILMAvailable: true,
      patternRollups,
    });
    const pathToFlattenedBucketMap = getPathToFlattenedBucketMap(flattenedBuckets);

    it('returns the expected number of layers', () => {
      expect(
        getLayersMultiDimensional({
          valueFormatter: formatBytes,
          layer0FillColor,
          pathToFlattenedBucketMap,
        }).length
      ).toEqual(2);
    });

    it('returns the expected fillLabel valueFormatter function', () => {
      getLayersMultiDimensional({
        valueFormatter: formatBytes,
        layer0FillColor,
        pathToFlattenedBucketMap,
      }).forEach((x) => expect(x.fillLabel.valueFormatter(123)).toEqual('123B'));
    });
  });
});
