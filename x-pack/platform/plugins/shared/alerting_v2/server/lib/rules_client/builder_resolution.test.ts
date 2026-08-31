/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateRuleData, UpdateRuleData } from '@kbn/alerting-v2-schemas';
import { z } from '@kbn/zod/v4';
import { createRuleSoAttributes } from '../test_utils';
import { BuilderTypeRegistry } from '../builder_types';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
import { resolveCreateRuleBuilder, resolveUpdateRuleBuilder } from './builder_resolution';

const STUB_QUERY = {
  format: 'composed' as const,
  base: 'FROM logs-*',
  breach: { segment: '| WHERE count > 5' },
};

const stubFieldsSchema = z
  .object({
    index: z.string().max(64),
    limit: z.number().optional(),
  })
  .strict();

/**
 * A registry holding one builder that echoes its `index` field into the query,
 * so assertions can tell a generated query from a caller-supplied one.
 */
const createRegistry = ({
  generate,
}: {
  generate?: (fields: { index: string; limit?: number }) => ReturnType<typeof buildQuery>;
} = {}) => {
  const registry = new BuilderTypeRegistry();
  registry.register({
    type: 'stub',
    builderFieldsSchema: stubFieldsSchema,
    generateQuery: (fields) =>
      (generate ?? buildQuery)(fields as { index: string; limit?: number }),
  });
  return registry;
};

const buildQuery = (fields: { index: string; limit?: number }) => ({
  query: {
    format: 'composed' as const,
    base: `FROM ${fields.index}`,
    breach: { segment: `| WHERE count > ${fields.limit ?? 0}` },
  },
  time_field: 'event.ingested',
  grouping: { fields: ['service.name'] },
});

const createData = (overrides: Partial<CreateRuleData> = {}): CreateRuleData =>
  ({
    kind: 'alert',
    metadata: { name: 'a rule' },
    time_field: '@timestamp',
    schedule: { every: '5m' },
    query: STUB_QUERY,
    ...overrides,
  } as CreateRuleData);

describe('resolveCreateRuleBuilder', () => {
  it('passes a caller-supplied query through untouched', () => {
    const data = createData();

    const resolved = resolveCreateRuleBuilder(createRegistry(), data);

    expect(resolved.query).toEqual(STUB_QUERY);
    expect(resolved.metadata.builder_fields).toBeUndefined();
  });

  it('generates the query from builder fields, so the caller need not send one', () => {
    const data = createData({
      query: undefined,
      metadata: {
        name: 'a rule',
        builder_type: 'stub',
        builder_fields: { index: 'metrics-*', limit: 10 },
      },
    });

    const resolved = resolveCreateRuleBuilder(createRegistry(), data);

    expect(resolved.query).toEqual({
      format: 'composed',
      base: 'FROM metrics-*',
      breach: { segment: '| WHERE count > 10' },
    });
  });

  it('takes time_field and grouping from the builder, which derives them from the same fields', () => {
    const data = createData({
      query: undefined,
      time_field: '@timestamp',
      grouping: { fields: ['host.name'] },
      metadata: {
        name: 'a rule',
        builder_type: 'stub',
        builder_fields: { index: 'metrics-*' },
      },
    });

    const resolved = resolveCreateRuleBuilder(createRegistry(), data);

    expect(resolved.time_field).toBe('event.ingested');
    expect(resolved.grouping).toEqual({ fields: ['service.name'] });
  });

  it('leaves time_field and grouping alone when the builder does not supply them', () => {
    const registry = createRegistry({
      generate: () => ({ query: STUB_QUERY } as ReturnType<typeof buildQuery>),
    });
    const data = createData({
      query: undefined,
      time_field: '@custom_time',
      grouping: { fields: ['host.name'] },
      metadata: {
        name: 'a rule',
        builder_type: 'stub',
        builder_fields: { index: 'metrics-*' },
      },
    });

    const resolved = resolveCreateRuleBuilder(registry, data);

    expect(resolved.time_field).toBe('@custom_time');
    expect(resolved.grouping).toEqual({ fields: ['host.name'] });
  });

  it('rejects an unregistered builder type', () => {
    const data = createData({
      query: undefined,
      metadata: { name: 'a rule', builder_type: 'nope', builder_fields: { index: 'logs-*' } },
    });

    expect(() => resolveCreateRuleBuilder(createRegistry(), data)).toThrow(
      /Unknown rule builder type/i
    );
  });

  it('rejects builder fields the builder schema does not accept', () => {
    const data = createData({
      query: undefined,
      metadata: { name: 'a rule', builder_type: 'stub', builder_fields: { wrong: true } },
    });

    expect(() => resolveCreateRuleBuilder(createRegistry(), data)).toThrow();
  });

  describe('signal rules', () => {
    const signalData = () =>
      createData({
        kind: 'signal',
        query: undefined,
        metadata: {
          name: 'a rule',
          builder_type: 'stub',
          builder_fields: { index: 'metrics-*', limit: 10 },
        },
      });

    it('flattens a composed query into the standalone format a signal rule needs', () => {
      const resolved = resolveCreateRuleBuilder(createRegistry(), signalData());

      expect(resolved.query).toEqual({
        format: 'standalone',
        breach: { query: 'FROM metrics-* | WHERE count > 10' },
      });
    });

    it('keeps a builder that already generates a standalone query as it is', () => {
      const standalone = {
        format: 'standalone' as const,
        breach: { query: 'FROM metrics-* | WHERE count > 1' },
      };
      const registry = createRegistry({
        generate: () => ({ query: standalone } as unknown as ReturnType<typeof buildQuery>),
      });

      const resolved = resolveCreateRuleBuilder(registry, signalData());

      expect(resolved.query).toEqual(standalone);
    });

    it('refuses a generated recovery query, which a signal rule cannot run', () => {
      const registry = createRegistry({
        generate: (fields) => ({
          ...buildQuery(fields),
          query: { ...STUB_QUERY, recovery: { segment: '| WHERE count < 1' } },
        }),
      });

      expect(() => resolveCreateRuleBuilder(registry, signalData())).toThrow(
        /generated a recovery query/i
      );
    });
  });

  it('refuses a generated query that omits a recovery block the strategy requires', () => {
    const data = createData({
      query: undefined,
      recovery_strategy: 'query',
      metadata: {
        name: 'a rule',
        builder_type: 'stub',
        builder_fields: { index: 'metrics-*' },
      },
    });

    expect(() => resolveCreateRuleBuilder(createRegistry(), data)).toThrow(
      /query\.recovery is required/i
    );
  });

  it('accepts a generated recovery block when the strategy asks for one', () => {
    const registry = createRegistry({
      generate: (fields) => ({
        ...buildQuery(fields),
        query: { ...buildQuery(fields).query, recovery: { segment: '| WHERE count < 1' } },
      }),
    });
    const data = createData({
      query: undefined,
      recovery_strategy: 'query',
      metadata: {
        name: 'a rule',
        builder_type: 'stub',
        builder_fields: { index: 'metrics-*' },
      },
    });

    expect(() => resolveCreateRuleBuilder(registry, data)).not.toThrow();
  });
});

describe('resolveUpdateRuleBuilder', () => {
  const builderManagedRule = () =>
    createRuleSoAttributes({
      metadata: {
        name: 'a rule',
        builder_type: 'stub',
        builder_fields: { index: 'logs-*', limit: 5 },
      },
    });

  const plainRule = () => createRuleSoAttributes({ metadata: { name: 'a rule' } });

  const expectBoomCode = (fn: () => unknown, code: string) => {
    try {
      fn();
    } catch (error) {
      expect(error.output.statusCode).toBe(400);
      expect(error.data.code).toBe(code);
      return;
    }
    throw new Error('Expected the resolution to throw');
  };

  it('regenerates the query when builder fields are written', () => {
    const data: UpdateRuleData = {
      metadata: { builder_fields: { index: 'metrics-*', limit: 42 } },
    };

    const resolved = resolveUpdateRuleBuilder(
      createRegistry(),
      'rule-1',
      data,
      builderManagedRule()
    );

    expect(resolved.query).toEqual({
      format: 'composed',
      base: 'FROM metrics-*',
      breach: { segment: '| WHERE count > 42' },
    });
    expect(resolved.metadata?.builder_type).toBe('stub');
  });

  it('regenerates a signal rule query in the standalone format its kind requires', () => {
    const existing = createRuleSoAttributes({
      kind: 'signal',
      query: { format: 'standalone', breach: { query: 'FROM logs-*' } },
      metadata: { name: 'a rule', builder_type: 'stub', builder_fields: { index: 'logs-*' } },
    });
    const data: UpdateRuleData = { metadata: { builder_fields: { index: 'metrics-*' } } };

    const resolved = resolveUpdateRuleBuilder(createRegistry(), 'rule-1', data, existing);

    expect(resolved.query).toEqual({
      format: 'standalone',
      breach: { query: 'FROM metrics-* | WHERE count > 0' },
    });
  });

  it('refuses a direct query change on a builder rule', () => {
    const data: UpdateRuleData = { query: STUB_QUERY };

    expectBoomCode(
      () => resolveUpdateRuleBuilder(createRegistry(), 'rule-1', data, builderManagedRule()),
      ALERTING_ERROR_CODES.BUILDER_TYPE_NOT_CLEARED
    );
  });

  it('lets a builder rule be saved with the query it already has', () => {
    // The rule form resubmits the query it loaded, so an unchanged one must not
    // read as an attempt to take the query away from the builder.
    const existing = builderManagedRule();
    const data: UpdateRuleData = { metadata: { name: 'renamed' }, query: existing.query };

    const resolved = resolveUpdateRuleBuilder(createRegistry(), 'rule-1', data, existing);

    expect(resolved.query).toEqual(existing.query);
  });

  it('accepts a direct query write once the rule opts out of builder mode', () => {
    const data: UpdateRuleData = { query: STUB_QUERY, metadata: { builder_type: null } };

    const resolved = resolveUpdateRuleBuilder(
      createRegistry(),
      'rule-1',
      data,
      builderManagedRule()
    );

    expect(resolved.query).toEqual(STUB_QUERY);
    expect(resolved.metadata?.builder_type).toBeNull();
    expect(resolved.metadata?.builder_fields).toBeNull();
  });

  it('clears the stored builder fields when opting out without mentioning them', () => {
    const data: UpdateRuleData = { metadata: { builder_type: null } };

    const resolved = resolveUpdateRuleBuilder(
      createRegistry(),
      'rule-1',
      data,
      builderManagedRule()
    );

    expect(resolved.metadata?.builder_fields).toBeNull();
  });

  it('allows a query write on a rule that has no builder', () => {
    const data: UpdateRuleData = { query: STUB_QUERY };

    const resolved = resolveUpdateRuleBuilder(createRegistry(), 'rule-1', data, plainRule());

    expect(resolved.query).toEqual(STUB_QUERY);
  });

  it('leaves an update that touches neither query nor builder untouched', () => {
    const data: UpdateRuleData = { metadata: { name: 'renamed' } };

    const resolved = resolveUpdateRuleBuilder(
      createRegistry(),
      'rule-1',
      data,
      builderManagedRule()
    );

    expect(resolved).toEqual(data);
  });

  it('lets a rule whose builder is no longer registered still be renamed', () => {
    const orphaned = createRuleSoAttributes({
      metadata: { name: 'a rule', builder_type: 'gone', builder_fields: { index: 'logs-*' } },
    });
    const data: UpdateRuleData = { metadata: { name: 'renamed' } };

    expect(() =>
      resolveUpdateRuleBuilder(createRegistry(), 'rule-1', data, orphaned)
    ).not.toThrow();
  });

  it('refuses builder fields on a rule with no builder type to validate them', () => {
    const data: UpdateRuleData = { metadata: { builder_fields: { index: 'logs-*' } } };

    expectBoomCode(
      () => resolveUpdateRuleBuilder(createRegistry(), 'rule-1', data, plainRule()),
      ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS
    );
  });

  it('refuses a builder type change that would orphan the stored fields', () => {
    const registry = createRegistry();
    registry.register({
      type: 'other',
      builderFieldsSchema: stubFieldsSchema,
      generateQuery: () => ({ query: STUB_QUERY }),
    });
    const data: UpdateRuleData = { metadata: { builder_type: 'other' } };

    expectBoomCode(
      () => resolveUpdateRuleBuilder(registry, 'rule-1', data, builderManagedRule()),
      ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS
    );
  });

  it('refuses adopting a builder without the fields to generate a query from', () => {
    const data: UpdateRuleData = { metadata: { builder_type: 'stub' } };

    expectBoomCode(
      () => resolveUpdateRuleBuilder(createRegistry(), 'rule-1', data, plainRule()),
      ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS
    );
  });

  it('adopts a builder when the fields come with it', () => {
    const data: UpdateRuleData = {
      metadata: { builder_type: 'stub', builder_fields: { index: 'metrics-*' } },
    };

    const resolved = resolveUpdateRuleBuilder(createRegistry(), 'rule-1', data, plainRule());

    expect(resolved.metadata?.builder_type).toBe('stub');
    expect(resolved.query).toEqual({
      format: 'composed',
      base: 'FROM metrics-*',
      breach: { segment: '| WHERE count > 0' },
    });
  });

  it('re-resolving the same builder type with new fields is allowed', () => {
    const data: UpdateRuleData = {
      metadata: { builder_type: 'stub', builder_fields: { index: 'metrics-*', limit: 1 } },
    };

    const resolved = resolveUpdateRuleBuilder(
      createRegistry(),
      'rule-1',
      data,
      builderManagedRule()
    );

    expect(resolved.metadata?.builder_fields).toEqual({ index: 'metrics-*', limit: 1 });
  });

  it('rejects fields the builder schema does not accept', () => {
    const data: UpdateRuleData = { metadata: { builder_fields: { nope: 1 } } };

    expectBoomCode(
      () => resolveUpdateRuleBuilder(createRegistry(), 'rule-1', data, builderManagedRule()),
      ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS
    );
  });
});
