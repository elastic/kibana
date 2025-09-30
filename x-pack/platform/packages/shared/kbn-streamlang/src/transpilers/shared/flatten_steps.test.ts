/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangStep } from '../../../types/streamlang';
import { flattenSteps } from './flatten_steps';

describe('flattenSteps', () => {
  it('should flatten a flat list of steps', () => {
    const steps = [
      { action: 'set', to: 'foo', value: 'bar' } as any,
      { action: 'rename', from: 'foo', to: 'baz' } as any,
    ];
    expect(flattenSteps(steps)).toEqual([
      { action: 'set', to: 'foo', value: 'bar' },
      { action: 'rename', from: 'foo', to: 'baz' },
    ]);
  });

  it('should flatten nested where blocks', () => {
    const steps = [
      {
        where: {
          field: 'foo',
          eq: 'bar',
          steps: [
            { action: 'set', to: 'baz', value: 'qux' },
            {
              where: {
                field: 'baz',
                eq: 'qux',
                steps: [{ action: 'rename', from: 'baz', to: 'final' }],
              },
            },
          ],
        },
      },
      { action: 'set', to: 'top', value: 'level' },
    ] as StreamlangStep[];

    expect(flattenSteps(steps)).toEqual([
      { action: 'set', to: 'baz', value: 'qux', where: { field: 'foo', eq: 'bar' } },
      {
        action: 'rename',
        from: 'baz',
        to: 'final',
        where: {
          and: [
            { field: 'foo', eq: 'bar' },
            { field: 'baz', eq: 'qux' },
          ],
        },
      },
      { action: 'set', to: 'top', value: 'level' },
    ]);
  });

  it('should handle empty steps', () => {
    expect(flattenSteps([])).toEqual([]);
  });

  it('should handle steps with no nesting', () => {
    const steps = [{ action: 'set', to: 'foo', value: 'bar' }] as StreamlangStep[];
    expect(flattenSteps(steps)).toEqual([{ action: 'set', to: 'foo', value: 'bar' }]);
  });
});
