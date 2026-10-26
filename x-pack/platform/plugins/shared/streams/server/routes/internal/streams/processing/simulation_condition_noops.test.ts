/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition, EnrichProcessor, StreamlangDSL } from '@kbn/streamlang';
import { conditionToPainless } from '@kbn/streamlang';
import type { StreamlangResolverOptions } from '@kbn/streamlang/types/resolvers';
import { buildSimulationProcessorsWithConditionNoops } from './simulation_condition_noops';

describe('buildSimulationProcessorsWithConditionNoops', () => {
  it('injects a no-op processor for a condition even if it has no descendants', async () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          customIdentifier: 'cond-1',
          condition: {
            field: 'foo',
            eq: 'bar',
            steps: [],
          },
        },
      ],
    };

    const processors = await buildSimulationProcessorsWithConditionNoops(dsl);

    expect(processors).toHaveLength(2);
    expect(processors[0]).toHaveProperty('set');
    expect(processors[0]!.set?.tag).toBe('cond-1');
    expect(processors[0]!.set?.field).toBe('_streams_condition_noop');
    expect(typeof processors[0]!.set?.if).toBe('string');
    expect(processors[1]).toHaveProperty('remove');
    expect(processors[1]!.remove?.tag).toBe('cond-1:noop-cleanup');
    expect(processors[1]!.remove?.field).toBe('_streams_condition_noop');
  });

  it('injects condition no-op before its descendants and keeps descendant processor tags', async () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          customIdentifier: 'cond-1',
          condition: {
            field: 'foo',
            eq: 'bar',
            steps: [
              {
                customIdentifier: 'proc-1',
                action: 'set',
                to: 'target',
                value: 'value',
              },
            ],
          },
        },
      ],
    };

    const processors = await buildSimulationProcessorsWithConditionNoops(dsl);

    expect(processors).toHaveLength(3);
    expect(processors[0]!.set?.tag).toBe('cond-1');
    expect(processors[1]!.remove?.tag).toBe('cond-1:noop-cleanup');
    expect(processors[1]!.remove?.field).toBe('_streams_condition_noop');
    expect(processors[2]!.set?.tag).toBe('proc-1');
    expect(typeof processors[2]!.set?.if).toBe('string');
  });

  it('composes nested condition no-ops with parent conditions', async () => {
    const parentCondition: Condition = { field: 'a', eq: 1 };
    const childCondition: Condition = { field: 'b', eq: 2 };
    const dsl: StreamlangDSL = {
      steps: [
        {
          customIdentifier: 'cond-parent',
          condition: {
            ...parentCondition,
            steps: [
              {
                customIdentifier: 'cond-child',
                condition: {
                  ...childCondition,
                  steps: [
                    {
                      customIdentifier: 'proc-1',
                      action: 'set',
                      to: 'target',
                      value: 'value',
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    };

    const processors = await buildSimulationProcessorsWithConditionNoops(dsl);

    expect(processors).toHaveLength(5);
    expect(processors[0]!.set?.tag).toBe('cond-parent');
    expect(processors[1]!.remove?.tag).toBe('cond-parent:noop-cleanup');
    expect(processors[1]!.remove?.field).toBe('_streams_condition_noop');
    expect(processors[2]!.set?.tag).toBe('cond-child');
    expect(processors[3]!.remove?.tag).toBe('cond-child:noop-cleanup');
    expect(processors[3]!.remove?.field).toBe('_streams_condition_noop');
    expect(processors[4]!.set?.tag).toBe('proc-1');

    const childSetIf = processors[2]!.set?.if;
    expect(childSetIf).toBe(conditionToPainless({ and: [parentCondition, childCondition] }));
  });

  it('does not inject else-branch no-ops when else is an empty array', async () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          customIdentifier: 'cond-1',
          condition: {
            field: 'foo',
            eq: 'bar',
            steps: [],
            else: [],
          },
        },
      ],
    };

    const processors = await buildSimulationProcessorsWithConditionNoops(dsl);

    expect(processors).toHaveLength(2);
    expect(processors[0]!.set?.tag).toBe('cond-1');
    expect(processors[1]!.remove?.tag).toBe('cond-1:noop-cleanup');
    const tags = processors.flatMap((p) => {
      const k = Object.keys(p)[0] as keyof typeof p;
      const cfg = p[k] as { tag?: string };
      return cfg.tag ? [cfg.tag] : [];
    });
    expect(tags.some((t) => t.includes(':else'))).toBe(false);
  });

  it('processes else-branch steps with negated condition', async () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          customIdentifier: 'cond-1',
          condition: {
            field: 'foo',
            eq: 'bar',
            steps: [
              {
                customIdentifier: 'proc-if',
                action: 'set',
                to: 'target',
                value: 'matched',
              },
            ],
            else: [
              {
                customIdentifier: 'proc-else',
                action: 'set',
                to: 'target',
                value: 'not_matched',
              },
            ],
          },
        },
      ],
    };

    const processors = await buildSimulationProcessorsWithConditionNoops(dsl);

    // Expect: condition noop (set + remove), if-branch proc, else-noop (set + remove), else-branch proc = 6
    expect(processors).toHaveLength(6);
    // First two: condition noop
    expect(processors[0]!.set?.tag).toBe('cond-1');
    expect(processors[1]!.remove?.tag).toBe('cond-1:noop-cleanup');
    // If-branch processor with original condition
    expect(processors[2]!.set?.tag).toBe('proc-if');
    expect(processors[2]!.set?.if).toBe(conditionToPainless({ field: 'foo', eq: 'bar' }));
    // Else-branch noop
    expect(processors[3]!.set?.tag).toBe('cond-1:else');
    expect(processors[4]!.remove?.tag).toBe('cond-1:else:noop-cleanup');
    // Else-branch processor with negated condition
    expect(processors[5]!.set?.tag).toBe('proc-else');
    expect(processors[5]!.set?.if).toBe(conditionToPainless({ not: { field: 'foo', eq: 'bar' } }));
  });

  it('emits noop processors for condition blocks nested inside else branches', async () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          customIdentifier: 'cond-outer',
          condition: {
            field: 'a',
            eq: '1',
            steps: [
              {
                customIdentifier: 'proc-if',
                action: 'set',
                to: 'target',
                value: 'if-value',
              },
            ],
            else: [
              {
                customIdentifier: 'cond-inner',
                condition: {
                  field: 'b',
                  eq: '2',
                  steps: [
                    {
                      customIdentifier: 'proc-inner-if',
                      action: 'set',
                      to: 'target',
                      value: 'inner-if',
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    };

    const processors = await buildSimulationProcessorsWithConditionNoops(dsl);

    // Outer condition noop (set + remove)
    expect(processors[0]!.set?.tag).toBe('cond-outer');
    expect(processors[1]!.remove?.tag).toBe('cond-outer:noop-cleanup');
    // If-branch processor
    expect(processors[2]!.set?.tag).toBe('proc-if');
    // Else-branch noop (set + remove)
    expect(processors[3]!.set?.tag).toBe('cond-outer:else');
    expect(processors[4]!.remove?.tag).toBe('cond-outer:else:noop-cleanup');
    // Inner condition noop (set + remove) — nested inside else
    expect(processors[5]!.set?.tag).toBe('cond-inner');
    expect(processors[6]!.remove?.tag).toBe('cond-inner:noop-cleanup');
    // Inner if-branch processor
    expect(processors[7]!.set?.tag).toBe('proc-inner-if');
  });

  it('composes else-branch noop conditions with the negated outer condition (nested else)', async () => {
    const outer: Condition = { field: 'a', eq: '1' };
    const inner: Condition = { field: 'b', eq: '2' };
    const dsl: StreamlangDSL = {
      steps: [
        {
          customIdentifier: 'cond-outer',
          condition: {
            ...outer,
            steps: [],
            else: [
              {
                customIdentifier: 'cond-inner',
                condition: {
                  ...inner,
                  steps: [],
                  else: [
                    {
                      customIdentifier: 'proc-inner-else',
                      action: 'set',
                      to: 't',
                      value: 'v',
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    };

    const processors = await buildSimulationProcessorsWithConditionNoops(dsl);
    const innerElseNoopIf = processors.find((p) => p.set?.tag === 'cond-inner:else')?.set?.if;

    expect(innerElseNoopIf).toBe(
      conditionToPainless({
        and: [{ not: outer }, { not: inner }],
      })
    );
  });

  it('transpiles enrich steps when an enrich policy resolver is provided', async () => {
    const enrichResolverOptions: StreamlangResolverOptions = {
      enrich: async () =>
        Promise.resolve({
          matchField: 'source.ip',
          enrichFields: ['city'],
        }),
    };

    const dsl: StreamlangDSL = {
      steps: [
        {
          action: 'enrich',
          policy_name: 'test-policy',
          to: 'geo',
        } as EnrichProcessor,
      ],
    };

    const processors = await buildSimulationProcessorsWithConditionNoops(
      dsl,
      enrichResolverOptions
    );

    expect(processors).toHaveLength(1);
    expect(processors[0]).toHaveProperty('enrich');
    expect(processors[0]!.enrich?.policy_name).toBe('test-policy');
    expect(processors[0]!.enrich?.field).toBe('source.ip');
    expect(processors[0]!.enrich?.target_field).toBe('geo');
  });
});
