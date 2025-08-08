/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertToRawColorMappings, isDeprecatedColorMapping } from './converter';
import { DeprecatedColorMappingConfig } from './types';
import { DataType } from '../../../types';
import { ColorMapping } from '@kbn/coloring';
import { GenericIndexPatternColumn } from '../../../async_services';
import { SerializedRangeKey } from '@kbn/data-plugin/common/search';

type OldAssignment = DeprecatedColorMappingConfig['assignments'][number];
type OldRule = OldAssignment['rule'];
type OldSpecialRule = DeprecatedColorMappingConfig['specialAssignments'][number]['rule'];

const baseConfig = {
  assignments: [],
  specialAssignments: [],
  paletteId: 'default',
  colorMode: {
    type: 'categorical',
  },
} satisfies DeprecatedColorMappingConfig | ColorMapping.Config;

const getOldColorMapping = (
  rules: OldRule[],
  specialRules: OldSpecialRule[] = []
): DeprecatedColorMappingConfig => ({
  assignments: rules.map((rule, i) => ({
    rule,
    color: {
      type: 'categorical',
      paletteId: 'default',
      colorIndex: i,
    },
    touched: false,
  })),
  specialAssignments: specialRules.map((rule) => ({
    rule,
    color: {
      type: 'loop',
    },
    touched: false,
  })),
  paletteId: 'default',
  colorMode: {
    type: 'categorical',
  },
});

function buildOldColorMapping(
  rules: OldRule[],
  specialRules: OldSpecialRule[] = []
): DeprecatedColorMappingConfig {
  return getOldColorMapping(rules, specialRules);
}

describe('converter', () => {
  describe('#convertToRawColorMappings', () => {
    it('should convert config with no assignments', () => {
      const oldConfig = buildOldColorMapping([]);
      const newConfig = convertToRawColorMappings(oldConfig);
      expect(newConfig.assignments).toHaveLength(0);
    });

    it('should keep top-level config', () => {
      const oldConfig = buildOldColorMapping([]);
      const newConfig = convertToRawColorMappings(oldConfig);
      expect(newConfig).toMatchObject({
        paletteId: 'default',
        colorMode: {
          type: 'categorical',
        },
      });
    });

    describe('type - auto', () => {
      it('should convert single auto rule', () => {
        const oldConfig = buildOldColorMapping([{ type: 'auto' }]);
        const newConfig = convertToRawColorMappings(oldConfig);
        expect(newConfig.assignments).toHaveLength(1);
        expect(newConfig.assignments[0].color).toBeDefined();
        expect(newConfig.assignments[0].rules).toEqual([]);
      });

      it('should convert multiple auto rule', () => {
        const oldConfig = buildOldColorMapping([
          { type: 'auto' },
          { type: 'matchExactly', values: [] },
          { type: 'auto' },
        ]);
        const newConfig = convertToRawColorMappings(oldConfig);
        expect(newConfig.assignments).toHaveLength(3);
        expect(newConfig.assignments[0].rules).toEqual([]);
        expect(newConfig.assignments[2].rules).toEqual([]);
      });
    });

    describe('type - matchExactly', () => {
      type ExpectedRule = Partial<ColorMapping.RuleMatchRaw | ColorMapping.RuleMatch>;
      interface ExpectedRulesByType {
        types: Array<DataType | 'undefined'>;
        expectedRule: ExpectedRule;
      }
      type MatchExactlyTestCase = [
        oldStringValue: string | string[],
        defaultExpectedRule: ExpectedRule,
        expectedRulesByType: ExpectedRulesByType[]
      ];

      const buildOldColorMappingFromValues = (values: Array<string | string[]>) =>
        buildOldColorMapping([{ type: 'matchExactly', values }]);

      it('should handle missing column', () => {
        const oldConfig = buildOldColorMapping([{ type: 'matchExactly', values: ['test'] }]);
        const newConfig = convertToRawColorMappings(oldConfig, undefined);
        expect(newConfig.assignments).toHaveLength(1);
        expect(newConfig.assignments[0].rules).toHaveLength(1);
        expect(newConfig.assignments[0].rules[0]).toEqual({
          type: 'match',
          pattern: 'test',
          matchEntireWord: true,
          matchCase: true,
        });
      });

      describe('multi_terms', () => {
        it('should convert array of string values as MultiFieldKey', () => {
          const values: string[] = ['some-string', '123', '0', '1', '1744261200000', '__other__'];
          const oldConfig = buildOldColorMappingFromValues([values]);
          const newConfig = convertToRawColorMappings(oldConfig, {});
          const rule = newConfig.assignments[0].rules[0];

          expect(rule).toEqual({
            type: 'raw',
            value: {
              keys: ['some-string', '123', '0', '1', '1744261200000', '__other__'],
              type: 'multiFieldKey',
            },
          });
        });

        it('should convert array of strings in multi_terms as MultiFieldKey', () => {
          const oldConfig = buildOldColorMappingFromValues([['some-string']]);
          const newConfig = convertToRawColorMappings(oldConfig, {
            fieldType: 'multi_terms',
          });
          const rule = newConfig.assignments[0].rules[0];

          expect(rule).toEqual({
            type: 'raw',
            value: {
              keys: ['some-string'],
              type: 'multiFieldKey',
            },
          });
        });

        it('should convert single string as basic match even in multi_terms column', () => {
          const oldConfig = buildOldColorMappingFromValues(['some-string']);
          const newConfig = convertToRawColorMappings(oldConfig, {
            fieldType: 'multi_terms',
          });
          const rule = newConfig.assignments[0].rules[0];

          expect(rule).toEqual({
            type: 'match',
            pattern: 'some-string',
            matchEntireWord: true,
            matchCase: true,
          });
        });
      });

      describe('range', () => {
        it.each<[rangeString: string, expectedRange: Pick<SerializedRangeKey, 'from' | 'to'>]>([
          ['from:0,to:1000', { from: 0, to: 1000 }],
          ['from:-1000,to:1000', { from: -1000, to: 1000 }],
          ['from:-1000,to:0', { from: -1000, to: 0 }],
          ['from:1000,to:undefined', { from: 1000, to: null }],
          ['from:undefined,to:1000', { from: null, to: 1000 }],
          ['from:undefined,to:undefined', { from: null, to: null }],
        ])('should convert range string %j to RangeKey', (rangeString, expectedRange) => {
          const oldConfig = buildOldColorMappingFromValues([rangeString]);
          const newConfig = convertToRawColorMappings(oldConfig, {
            fieldType: 'range',
          });
          const rule = newConfig.assignments[0].rules[0];

          expect(rule).toEqual({
            type: 'raw',
            value: {
              ...expectedRange,
              type: 'rangeKey',
              ranges: [],
            },
          });
        });

        it('should convert non-range string to match', () => {
          const oldConfig = buildOldColorMappingFromValues(['not-a-range']);
          const newConfig = convertToRawColorMappings(oldConfig, {
            fieldType: 'range',
          });
          const rule = newConfig.assignments[0].rules[0];

          expect(rule).toEqual({
            type: 'match',
            pattern: 'not-a-range',
            matchEntireWord: true,
            matchCase: true,
          });
        });
      });

      describe.each<DataType | undefined>([
        'number',
        'boolean',
        'date',
        'string',
        'ip',
        undefined, // other
      ])('Column dataType - %s', (dataType) => {
        const column: Partial<GenericIndexPatternColumn> = { dataType };

        it.each<MatchExactlyTestCase>([
          [
            '123.456',
            {
              type: 'raw',
              value: 123.456,
            },
            [
              { types: ['string', 'ip'], expectedRule: { type: 'raw', value: '123.456' } },
              {
                types: ['undefined', 'boolean'],
                expectedRule: { type: 'match', pattern: '123.456' },
              },
            ],
          ],
          [
            '1744261200000',
            {
              type: 'raw',
              value: 1744261200000,
            },
            [
              { types: ['string', 'ip'], expectedRule: { type: 'raw', value: '1744261200000' } },
              {
                types: ['undefined', 'boolean'],
                expectedRule: { type: 'match', pattern: '1744261200000' },
              },
            ],
          ],
          [
            '__other__',
            {
              type: 'raw',
              value: '__other__',
            },
            [{ types: ['undefined'], expectedRule: { type: 'match', pattern: '__other__' } }],
          ],
          [
            'some-string',
            {
              type: 'raw',
              value: 'some-string',
            },
            [
              {
                types: ['undefined', 'number', 'boolean', 'date'],
                expectedRule: { type: 'match', pattern: 'some-string' },
              },
            ],
          ],
          [
            'false',
            {
              type: 'raw',
              value: 'false',
            },
            [
              {
                types: ['undefined', 'number', 'date'],
                expectedRule: { type: 'match', pattern: 'false' },
              },
            ],
          ],
          [
            'true',
            {
              type: 'raw',
              value: 'true',
            },
            [
              {
                types: ['undefined', 'number', 'date'],
                expectedRule: { type: 'match', pattern: 'true' },
              },
            ],
          ],
          [
            '0', // false
            {
              type: 'raw',
              value: 0,
            },
            [
              { types: ['string', 'ip'], expectedRule: { type: 'raw', value: '0' } },
              { types: ['undefined'], expectedRule: { type: 'match', pattern: '0' } },
            ],
          ],
          [
            '1', // true
            {
              type: 'raw',
              value: 1,
            },
            [
              { types: ['string', 'ip'], expectedRule: { type: 'raw', value: '1' } },
              { types: ['undefined'], expectedRule: { type: 'match', pattern: '1' } },
            ],
          ],
          [
            '127.0.0.1',
            {
              type: 'raw',
              value: '127.0.0.1',
            },
            [
              {
                types: ['undefined', 'number', 'boolean', 'date'],
                expectedRule: { type: 'match', pattern: '127.0.0.1' },
              },
            ],
          ],
        ])('should correctly convert %j', (value, defaultExpectedRule, expectedRulesByType) => {
          const oldConfig = buildOldColorMappingFromValues([value]);
          const expectedRule =
            expectedRulesByType.find((r) => r.types.includes(dataType ?? 'undefined'))
              ?.expectedRule ?? defaultExpectedRule;
          const newConfig = convertToRawColorMappings(oldConfig, { ...column });
          const rule = newConfig.assignments[0].rules[0];

          if (expectedRule.type === 'match') {
            // decorate match type with default constants
            expectedRule.matchEntireWord = true;
            expectedRule.matchCase = true;
          }

          expect(rule).toEqual(expectedRule);
        });
      });
    });
  });

  describe('#isDeprecatedColorMapping', () => {
    const baseAssignment = {
      color: {
        type: 'categorical',
        paletteId: 'default',
        colorIndex: 3,
      },
      touched: false,
    } satisfies Omit<OldAssignment, 'rule'>;

    it('should return true if assignments.rule exists', () => {
      const isDeprecated = isDeprecatedColorMapping({
        ...baseConfig,
        assignments: [
          {
            ...baseAssignment,
            rule: {
              type: 'auto',
            },
          },
        ],
      });
      expect(isDeprecated).toBe(true);
    });

    it('should return true if specialAssignments.rule exists', () => {
      const isDeprecated = isDeprecatedColorMapping({
        ...baseConfig,
        specialAssignments: [
          {
            ...baseAssignment,
            rule: {
              type: 'other',
            },
          },
        ],
      });
      expect(isDeprecated).toBe(true);
    });

    it('should return false if assignments.rule does not exist', () => {
      const isDeprecated = isDeprecatedColorMapping({
        ...baseConfig,
        assignments: [
          {
            ...baseAssignment,
            rules: [
              {
                type: 'match',
                pattern: 'test',
              },
            ],
          },
        ],
      });
      expect(isDeprecated).toBe(false);
    });

    it('should return false if specialAssignments.rule does not exist', () => {
      const isDeprecated = isDeprecatedColorMapping({
        ...baseConfig,
        specialAssignments: [
          {
            ...baseAssignment,
            rules: [
              {
                type: 'other',
              },
            ],
          },
        ],
      });
      expect(isDeprecated).toBe(false);
    });
  });
});
