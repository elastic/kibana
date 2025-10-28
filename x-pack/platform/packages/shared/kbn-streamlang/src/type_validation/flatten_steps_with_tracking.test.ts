/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangDSL } from '../../types/streamlang';
import { flattenStepsWithTracking } from './flatten_steps_with_tracking';

describe('flattenStepsWithTracking', () => {
  it('marks unconditional processors as not conditional', () => {
    const steps = [
      { action: 'set' as const, to: 'foo', value: 'bar' },
      { action: 'rename' as const, from: 'a', to: 'b' },
    ];

    const result = flattenStepsWithTracking(steps);

    expect(result).toHaveLength(2);
    expect(result[0].isConditional).toBe(false);
    expect(result[1].isConditional).toBe(false);
  });

  it('marks processors inside where blocks as conditional', () => {
    const steps = [
      {
        where: {
          field: 'foo',
          eq: 'bar',
          steps: [{ action: 'set' as const, to: 'a', value: 'b' }],
        },
      },
    ];

    const result = flattenStepsWithTracking(steps);

    expect(result).toHaveLength(1);
    expect(result[0].isConditional).toBe(true);
    expect(result[0].processor.action).toBe('set');
  });

  it('marks processors with inline where as conditional', () => {
    const steps = [
      {
        action: 'set' as const,
        to: 'foo',
        value: 'bar',
        where: { field: 'baz', eq: 'qux' },
      },
    ];

    const result = flattenStepsWithTracking(steps);

    expect(result).toHaveLength(1);
    expect(result[0].isConditional).toBe(true);
  });

  it('handles nested where blocks correctly', () => {
    const steps = [
      {
        where: {
          field: 'foo',
          eq: 'bar',
          steps: [
            { action: 'set' as const, to: 'a', value: 'b' },
            {
              where: {
                field: 'baz',
                eq: 'qux',
                steps: [{ action: 'append' as const, to: 'c', value: [3] }],
              },
            },
          ],
        },
      },
      { action: 'set' as const, to: 'x', value: 'y' },
    ];

    const result = flattenStepsWithTracking(steps);

    expect(result).toHaveLength(3);
    // First set inside outer where: conditional
    expect(result[0].processor.action).toBe('set');
    expect(result[0].isConditional).toBe(true);
    // Append inside nested where: conditional
    expect(result[1].processor.action).toBe('append');
    expect(result[1].isConditional).toBe(true);
    // Last set at top level: not conditional
    expect(result[2].processor.action).toBe('set');
    expect(result[2].isConditional).toBe(false);
  });

  it('handles mixed conditional and unconditional steps', () => {
    const steps = [
      { action: 'set' as const, to: 'foo', value: 'bar' }, // unconditional
      {
        where: {
          field: 'x',
          eq: 'y',
          steps: [{ action: 'rename' as const, from: 'a', to: 'b' }], // conditional
        },
      },
      { action: 'set' as const, to: 'baz', value: 'qux' }, // unconditional
    ];

    const result = flattenStepsWithTracking(steps);

    expect(result).toHaveLength(3);
    expect(result[0].isConditional).toBe(false);
    expect(result[1].isConditional).toBe(true);
    expect(result[2].isConditional).toBe(false);
  });

  it('handles empty steps', () => {
    const result = flattenStepsWithTracking([]);
    expect(result).toHaveLength(0);
  });

  it('works with StreamlangDSL structure', () => {
    const dsl: StreamlangDSL = {
      steps: [
        { action: 'set', to: 'foo', value: 'bar' },
        {
          where: {
            field: 'test',
            eq: 'value',
            steps: [{ action: 'set', to: 'nested', value: 'data' }],
          },
        },
      ],
    };

    const result = flattenStepsWithTracking(dsl.steps);

    expect(result).toHaveLength(2);
    expect(result[0].isConditional).toBe(false);
    expect(result[1].isConditional).toBe(true);
  });
});
