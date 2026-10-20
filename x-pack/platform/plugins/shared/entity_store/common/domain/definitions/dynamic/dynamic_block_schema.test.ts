/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_ATTRIBUTE_NAME_LENGTH,
  MAX_ATTRIBUTES_PER_SOURCE,
  MAX_FIELD_PATH_LENGTH,
  MAX_FILTER_LENGTH,
  MAX_INDEX_PATTERN_LENGTH,
  MAX_SOURCES,
  MAX_VALUE_LABEL_LENGTH,
  MAX_VALUE_LABELS,
  dynamicAttributeSchema,
  dynamicBlockSchema,
  dynamicSourceSchema,
  isLiteralFieldPath,
  literalFieldPathSchema,
  type DynamicAttribute,
  type DynamicSource,
} from './dynamic_block_schema';

const attribute = (overrides: Partial<DynamicAttribute> = {}): DynamicAttribute => ({
  name: 'os_name',
  field: 'host.os.name',
  ...overrides,
});

const source = (overrides: Partial<DynamicSource> = {}): DynamicSource => ({
  indexPattern: 'metrics-system.*',
  ...overrides,
});

const attributes = (count: number): DynamicAttribute[] =>
  Array.from({ length: count }, (_, index) =>
    attribute({ name: `a${index}`, field: `f.${index}` })
  );

const valueLabels = (count: number): Record<string, string> =>
  Object.fromEntries(Array.from({ length: count }, (_, index) => [`${index}`, `label_${index}`]));

const issuePaths = (result: { error?: { issues: Array<{ path: PropertyKey[] }> } }) =>
  result.error?.issues.map(({ path }) => path);

describe('dynamicBlockSchema', () => {
  it('accepts a block with one source and no attributes', () => {
    expect(dynamicBlockSchema.safeParse({ sources: [source()] }).success).toBe(true);
  });

  describe('sources', () => {
    it('rejects an empty source list', () => {
      expect(dynamicBlockSchema.safeParse({ sources: [] }).success).toBe(false);
    });

    it(`accepts ${MAX_SOURCES} sources`, () => {
      const sources = Array.from({ length: MAX_SOURCES }, () => source());
      expect(dynamicBlockSchema.safeParse({ sources }).success).toBe(true);
    });

    it(`rejects ${MAX_SOURCES + 1} sources`, () => {
      const sources = Array.from({ length: MAX_SOURCES + 1 }, () => source());
      expect(dynamicBlockSchema.safeParse({ sources }).success).toBe(false);
    });

    it('accepts the same index pattern on two sources with different filters', () => {
      const result = dynamicBlockSchema.safeParse({
        sources: [
          source({ indexPattern: 'metrics-kubernetes.*', filter: 'metricset.name == "pod"' }),
          source({ indexPattern: 'metrics-kubernetes.*', filter: 'metricset.name == "node"' }),
        ],
      });
      expect(result.success).toBe(true);
    });

    it('accepts the same attribute name on two sources', () => {
      const result = dynamicBlockSchema.safeParse({
        sources: [
          source({
            indexPattern: 'metrics-hostmetricsreceiver.otel-default',
            attributes: [attribute({ name: 'os_type', field: 'os.type' })],
          }),
          source({ attributes: [attribute({ name: 'os_type', field: 'host.os.type' })] }),
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('unknown keys', () => {
    it('rejects an unknown key on the block', () => {
      expect(dynamicBlockSchema.safeParse({ sources: [source()], metrics: [] }).success).toBe(
        false
      );
    });

    it('rejects an unknown key on a source', () => {
      expect(dynamicSourceSchema.safeParse({ ...source(), index: 'logs-*' }).success).toBe(false);
    });

    it('rejects an unknown key on an attribute', () => {
      expect(dynamicAttributeSchema.safeParse({ ...attribute(), label: 'OS' }).success).toBe(false);
    });
  });
});

describe('dynamicSourceSchema', () => {
  describe('indexPattern', () => {
    it('accepts a single pattern with a wildcard', () => {
      expect(dynamicSourceSchema.safeParse(source({ indexPattern: 'metrics-*' })).success).toBe(
        true
      );
    });

    it('rejects a comma-separated list', () => {
      expect(
        dynamicSourceSchema.safeParse(source({ indexPattern: 'metrics-a,metrics-b' })).success
      ).toBe(false);
    });

    it('rejects whitespace', () => {
      expect(dynamicSourceSchema.safeParse(source({ indexPattern: 'metrics- a' })).success).toBe(
        false
      );
    });

    it('rejects an empty pattern', () => {
      expect(dynamicSourceSchema.safeParse(source({ indexPattern: '' })).success).toBe(false);
    });

    it(`accepts ${MAX_INDEX_PATTERN_LENGTH} characters and rejects one more`, () => {
      const at = 'a'.repeat(MAX_INDEX_PATTERN_LENGTH);
      expect(dynamicSourceSchema.safeParse(source({ indexPattern: at })).success).toBe(true);
      expect(dynamicSourceSchema.safeParse(source({ indexPattern: `${at}a` })).success).toBe(false);
    });
  });

  describe('filter', () => {
    it('accepts an ES|QL boolean expression', () => {
      expect(
        dynamicSourceSchema.safeParse(source({ filter: 'metricset.name == "cpu"' })).success
      ).toBe(true);
    });

    it('rejects an empty filter', () => {
      expect(dynamicSourceSchema.safeParse(source({ filter: '' })).success).toBe(false);
    });

    it(`accepts ${MAX_FILTER_LENGTH} characters and rejects one more`, () => {
      const at = 'a'.repeat(MAX_FILTER_LENGTH);
      expect(dynamicSourceSchema.safeParse(source({ filter: at })).success).toBe(true);
      expect(dynamicSourceSchema.safeParse(source({ filter: `${at}a` })).success).toBe(false);
    });
  });

  describe('attributes', () => {
    it(`accepts ${MAX_ATTRIBUTES_PER_SOURCE} attributes`, () => {
      expect(
        dynamicSourceSchema.safeParse(source({ attributes: attributes(MAX_ATTRIBUTES_PER_SOURCE) }))
          .success
      ).toBe(true);
    });

    it(`rejects ${MAX_ATTRIBUTES_PER_SOURCE + 1} attributes`, () => {
      expect(
        dynamicSourceSchema.safeParse(
          source({ attributes: attributes(MAX_ATTRIBUTES_PER_SOURCE + 1) })
        ).success
      ).toBe(false);
    });

    it('rejects a duplicate attribute name with a path to the duplicate', () => {
      const result = dynamicSourceSchema.safeParse(
        source({
          attributes: [
            attribute({ name: 'os', field: 'host.os.name' }),
            attribute({ name: 'phase', field: 'k8s.pod.phase' }),
            attribute({ name: 'os', field: 'os.type' }),
          ],
        })
      );
      expect(result.success).toBe(false);
      expect(issuePaths(result)).toEqual([['attributes', 2, 'name']]);
      expect(result.error?.issues[0].message).toMatch(/unique within a source/);
    });
  });
});

describe('dynamicAttributeSchema', () => {
  describe('name', () => {
    it.each(['os', 'os_name', 'a1'])('accepts %s', (name) => {
      expect(dynamicAttributeSchema.safeParse(attribute({ name })).success).toBe(true);
    });

    it.each([
      ['uppercase', 'OsName'],
      ['a leading digit', '1os'],
      ['a leading underscore', '_os'],
      ['a dot', 'os.name'],
      ['empty', ''],
    ])('rejects %s', (_, name) => {
      expect(dynamicAttributeSchema.safeParse(attribute({ name })).success).toBe(false);
    });

    it(`accepts ${MAX_ATTRIBUTE_NAME_LENGTH} characters and rejects one more`, () => {
      const at = 'a'.repeat(MAX_ATTRIBUTE_NAME_LENGTH);
      expect(dynamicAttributeSchema.safeParse(attribute({ name: at })).success).toBe(true);
      expect(dynamicAttributeSchema.safeParse(attribute({ name: `${at}a` })).success).toBe(false);
    });
  });

  describe('field', () => {
    it.each(['host.os.name', '@timestamp', 'k8s.pod.uid', 'labels.my-label', 'a_b'])(
      'accepts %s',
      (field) => {
        expect(dynamicAttributeSchema.safeParse(attribute({ field })).success).toBe(true);
      }
    );

    it.each([
      ['a wildcard', 'host.*'],
      ['an expression', 'TO_LOWER(host.name)'],
      ['a double quote', '"host.name"'],
      ['a single quote', "'host.name'"],
      ['a backtick', '`host.name`'],
      ['whitespace', 'host .name'],
      ['an empty segment', 'host..name'],
      ['empty', ''],
    ])('rejects %s', (_, field) => {
      expect(dynamicAttributeSchema.safeParse(attribute({ field })).success).toBe(false);
    });

    it(`accepts ${MAX_FIELD_PATH_LENGTH} characters and rejects one more`, () => {
      const at = 'a'.repeat(MAX_FIELD_PATH_LENGTH);
      expect(dynamicAttributeSchema.safeParse(attribute({ field: at })).success).toBe(true);
      expect(dynamicAttributeSchema.safeParse(attribute({ field: `${at}a` })).success).toBe(false);
    });
  });

  describe('valueLabels', () => {
    it(`accepts ${MAX_VALUE_LABELS} entries`, () => {
      expect(
        dynamicAttributeSchema.safeParse(attribute({ valueLabels: valueLabels(MAX_VALUE_LABELS) }))
          .success
      ).toBe(true);
    });

    it(`rejects ${MAX_VALUE_LABELS + 1} entries`, () => {
      expect(
        dynamicAttributeSchema.safeParse(
          attribute({ valueLabels: valueLabels(MAX_VALUE_LABELS + 1) })
        ).success
      ).toBe(false);
    });

    it(`accepts keys and labels of ${MAX_VALUE_LABEL_LENGTH} characters`, () => {
      const at = 'a'.repeat(MAX_VALUE_LABEL_LENGTH);
      expect(
        dynamicAttributeSchema.safeParse(attribute({ valueLabels: { [at]: at } })).success
      ).toBe(true);
    });

    it('rejects a key that is too long', () => {
      const tooLong = 'a'.repeat(MAX_VALUE_LABEL_LENGTH + 1);
      expect(
        dynamicAttributeSchema.safeParse(attribute({ valueLabels: { [tooLong]: 'x' } })).success
      ).toBe(false);
    });

    it('rejects a label that is too long', () => {
      const tooLong = 'a'.repeat(MAX_VALUE_LABEL_LENGTH + 1);
      expect(
        dynamicAttributeSchema.safeParse(attribute({ valueLabels: { x: tooLong } })).success
      ).toBe(false);
    });

    it('rejects an empty key or label', () => {
      expect(
        dynamicAttributeSchema.safeParse(attribute({ valueLabels: { '': 'x' } })).success
      ).toBe(false);
      expect(dynamicAttributeSchema.safeParse(attribute({ valueLabels: { x: '' } })).success).toBe(
        false
      );
    });
  });
});

describe('literal field paths', () => {
  it('isLiteralFieldPath agrees with literalFieldPathSchema', () => {
    const cases = ['host.name', 'host.*', 'a b', '', 'a'.repeat(MAX_FIELD_PATH_LENGTH + 1)];
    for (const value of cases) {
      expect(isLiteralFieldPath(value)).toBe(literalFieldPathSchema.safeParse(value).success);
    }
  });
});
