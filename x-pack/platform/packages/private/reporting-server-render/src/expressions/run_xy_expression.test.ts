/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import { runXyExpressionFunctions } from './run_xy_expression';

const table: Datatable = {
  type: 'datatable',
  columns: [
    { id: 'x', name: 'x', meta: { type: 'string' } },
    { id: 'y', name: 'y', meta: { type: 'number' } },
  ],
  rows: [
    { x: 'Mon', y: 1 },
    { x: 'Tue', y: 4 },
    { x: 'Wed', y: 2 },
    { x: 'Thu', y: 6 },
  ],
};

describe('runXyExpressionFunctions (Spike C)', () => {
  it('runs the real extendedDataLayer + xyVis expression functions against a literal datatable', async () => {
    const result = await runXyExpressionFunctions({
      table,
      seriesType: 'line',
      xAccessor: 'x',
      accessors: ['y'],
    });

    expect(result.type).toBe('render');
    expect(result.as).toBe('xyVis');
    expect(result.value.args.layers).toHaveLength(1);
    expect(result.value.args.layers[0]).toMatchObject({
      layerType: 'data',
      seriesType: 'line',
      xAccessor: 'x',
      accessors: ['y'],
      table,
    });
  });
});
