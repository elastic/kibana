/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition, StreamlangDSL } from '@kbn/streamlang';
import { conditionToPainless } from '@kbn/streamlang';
import { buildSimulationProcessorsWithConditionNoops } from './simulation_condition_noops';

describe('buildSimulationProcessorsWithConditionNoops', () => {
  it('injects a no-op processor for a condition even if it has no descendants', () => {
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

    const processors = buildSimulationProcessorsWithConditionNoops(dsl);

    expect(processors).toHaveLength(2);
    expect(processors[0]).toHaveProperty('set');
    expect((processors[0] as any).set.tag).toBe('cond-1');
    expect((processors[0] as any).set.field).toBe('_streams_condition_noop');
    expect(typeof (processors[0] as any).set.if).toBe('string');
    expect(processors[1]).toHaveProperty('remove');
    expect((processors[1] as any).remove.field).toBe('_streams_condition_noop');
  });

  it('injects condition no-op before its descendants and keeps descendant processor tags', () => {
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

    const processors = buildSimulationProcessorsWithConditionNoops(dsl);

    expect(processors).toHaveLength(4);
    expect((processors[0] as any).set.tag).toBe('cond-1');
    expect((processors[1] as any).remove.field).toBe('_streams_condition_noop');
    expect((processors[2] as any).set.tag).toBe('proc-1');
    expect(typeof (processors[2] as any).set.if).toBe('string');
  });

  it('composes nested condition no-ops with parent conditions', () => {
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

    const processors = buildSimulationProcessorsWithConditionNoops(dsl);

    expect(processors).toHaveLength(7);
    expect((processors[0] as any).set.tag).toBe('cond-parent');
    expect((processors[1] as any).remove.field).toBe('_streams_condition_noop');
    expect((processors[2] as any).set.tag).toBe('cond-child');
    expect((processors[3] as any).remove.field).toBe('_streams_condition_noop');
    expect((processors[4] as any).set.tag).toBe('proc-1');

    const childSetIf = (processors[2] as any).set.if as string;
    expect(childSetIf).toBe(conditionToPainless({ and: [parentCondition, childCondition] }));
  });
});
