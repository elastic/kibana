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
  MAX_METRICS_PER_SOURCE,
  MAX_SOURCES,
  MAX_VALUE_LABEL_LENGTH,
  MAX_VALUE_LABELS,
  dynamicAttributeSchema,
  dynamicBlockSchema,
  dynamicMetricSchema,
  dynamicSourceSchema,
  isConcreteIndexPattern,
  isLiteralFieldPath,
  literalFieldPathSchema,
  type DynamicAttribute,
  type DynamicMetric,
  type DynamicSource,
} from './dynamic_block_schema';

const attribute = (overrides: Partial<DynamicAttribute> = {}): DynamicAttribute => ({
  name: 'os_name',
  field: 'host.os.name',
  ...overrides,
});

const metric = (overrides: Partial<DynamicMetric> = {}): DynamicMetric => ({
  name: 'system.cpu.utilization',
  field: 'system.cpu.utilization',
  agg: 'last',
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

    it('rejects a per-metric label', () => {
      expect(dynamicMetricSchema.safeParse({ ...metric(), label: 'CPU' }).success).toBe(false);
    });

    it('rejects index_mode on a metric', () => {
      expect(
        dynamicMetricSchema.safeParse({ ...metric(), index_mode: 'time_series' }).success
      ).toBe(false);
    });
  });

  describe('metrics', () => {
    it('accepts dual-source last for the same metric name', () => {
      const result = dynamicBlockSchema.safeParse({
        sources: [
          source({
            indexPattern: 'metrics-hostmetricsreceiver.otel-*',
            metrics: [
              metric({
                filter: 'state == "idle"',
                scale: -1,
                offset: 1,
                unit: 'percent',
              }),
            ],
          }),
          source({
            filter: 'metricset.name == "cpu"',
            metrics: [
              metric({
                field: 'system.cpu.total.norm.pct',
                unit: 'percent',
              }),
            ],
          }),
        ],
      });
      expect(result.success).toBe(true);
    });

    it('treats empty metrics like absent metrics', () => {
      expect(dynamicSourceSchema.safeParse(source({ metrics: [] })).success).toBe(true);
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

    it('accepts a data stream name without a wildcard', () => {
      expect(
        dynamicSourceSchema.safeParse(
          source({ indexPattern: 'metrics-hostmetricsreceiver.otel-default' })
        ).success
      ).toBe(true);
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

    it('rejects a data-stream backing index (`.ds-…-00000N`)', () => {
      const backing =
        '.ds-metrics-kubernetes.state_container-default-2026.11.20-000002';
      const result = dynamicSourceSchema.safeParse(source({ indexPattern: backing }));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.message.includes('concrete'))).toBe(true);
      }
    });

    it('rejects a remote-cluster backing index', () => {
      expect(
        dynamicSourceSchema.safeParse(
          source({ indexPattern: 'cluster:.ds-metrics-kubernetes.state_container-default-000001' })
        ).success
      ).toBe(false);
    });

    it('rejects a generation-suffixed concrete index without a wildcard', () => {
      expect(
        dynamicSourceSchema.safeParse(
          source({ indexPattern: 'metrics-kubernetes.state_container-default-000002' })
        ).success
      ).toBe(false);
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

  describe('metrics', () => {
    it(`accepts ${MAX_METRICS_PER_SOURCE} metrics`, () => {
      const metrics = Array.from({ length: MAX_METRICS_PER_SOURCE }, (_, index) =>
        metric({ name: `m${index}`, field: `f.${index}` })
      );
      expect(dynamicSourceSchema.safeParse(source({ metrics })).success).toBe(true);
    });

    it(`rejects ${MAX_METRICS_PER_SOURCE + 1} metrics`, () => {
      const metrics = Array.from({ length: MAX_METRICS_PER_SOURCE + 1 }, (_, index) =>
        metric({ name: `m${index}`, field: `f.${index}` })
      );
      expect(dynamicSourceSchema.safeParse(source({ metrics })).success).toBe(false);
    });

    it('rejects a duplicate metric name with a path to the duplicate', () => {
      const result = dynamicSourceSchema.safeParse(
        source({
          metrics: [
            metric({ name: 'cpu', field: 'a' }),
            metric({ name: 'mem', field: 'b' }),
            metric({ name: 'cpu', field: 'c' }),
          ],
        })
      );
      expect(result.success).toBe(false);

      expect(issuePaths(result)).toEqual([['metrics', 2, 'name']]);
    });

    it('rejects a metric name that matches an attribute in the same source', () => {
      const result = dynamicSourceSchema.safeParse(
        source({
          attributes: [attribute({ name: 'cpu', field: 'host.cpu' })],
          metrics: [metric({ name: 'cpu', field: 'system.cpu.utilization' })],
        })
      );
      expect(result.success).toBe(false);
      expect(issuePaths(result)).toEqual([['metrics', 0, 'name']]);
    });
  });
});

describe('dynamicMetricSchema', () => {
  it.each(['last', 'avg', 'sum_rate', 'count_distinct'] as const)('accepts agg %s', (agg) => {
    expect(dynamicMetricSchema.safeParse(metric({ agg })).success).toBe(true);
  });

  it('rejects an unknown agg', () => {
    expect(dynamicMetricSchema.safeParse(metric({ agg: 'percentile' as 'last' })).success).toBe(
      false
    );
  });

  it('rejects scale on count', () => {
    expect(dynamicMetricSchema.safeParse(metric({ agg: 'count', scale: 2 })).success).toBe(false);
  });

  it('rejects offset on count_distinct', () => {
    expect(
      dynamicMetricSchema.safeParse(metric({ agg: 'count_distinct', offset: 1 })).success
    ).toBe(false);
  });

  it('rejects offset on a rate but allows scale', () => {
    expect(dynamicMetricSchema.safeParse(metric({ agg: 'sum_rate', scale: 8 })).success).toBe(true);
    expect(dynamicMetricSchema.safeParse(metric({ agg: 'sum_rate', offset: 1 })).success).toBe(
      false
    );
  });

  it('rejects non-finite scale', () => {
    expect(dynamicMetricSchema.safeParse(metric({ scale: Number.NaN })).success).toBe(false);
    expect(dynamicMetricSchema.safeParse(metric({ scale: Number.POSITIVE_INFINITY })).success).toBe(
      false
    );
  });

  it('rejects a free-text unit outside the closed set', () => {
    expect(dynamicMetricSchema.safeParse(metric({ unit: 'widgets' as 'count' })).success).toBe(
      false
    );
  });
});

describe('dynamicAttributeSchema', () => {
  describe('name', () => {
    it.each([
      'os',
      'os_name',
      'a1',
      'host.arch',
      'os.type',
      'k8s.pod.phase',
      'Host.Arch',
      'label-with-dash',
    ])('accepts %s', (name) => {
      expect(dynamicAttributeSchema.safeParse(attribute({ name })).success).toBe(true);
    });

    it.each([
      ['a leading dot', '.os'],
      ['a trailing dot', 'os.'],
      ['consecutive dots', 'os..type'],
      ['whitespace', 'os type'],
      ['a backtick', 'os`type'],
      ['a slash', 'os/type'],
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

describe('isConcreteIndexPattern', () => {
  it('accepts data streams and wildcards', () => {
    expect(isConcreteIndexPattern('metrics-kubernetes.state_container-*')).toBe(false);
    expect(isConcreteIndexPattern('metrics-hostmetricsreceiver.otel-default')).toBe(false);
    expect(isConcreteIndexPattern('cluster:metrics-*')).toBe(false);
  });

  it('rejects backing and generation-suffixed concrete indices', () => {
    expect(
      isConcreteIndexPattern('.ds-metrics-kubernetes.state_container-default-2026.11.20-000002')
    ).toBe(true);
    expect(
      isConcreteIndexPattern('cluster:.ds-metrics-kubernetes.state_container-default-000001')
    ).toBe(true);
    expect(isConcreteIndexPattern('metrics-kubernetes.state_container-default-000002')).toBe(true);
  });
});
