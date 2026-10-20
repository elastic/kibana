/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { joinProcessorRows } from './join_processor_rows';

const rateRows = [{ step: 'uppercase-message', incoming_rate: 4.6 }];

const sumsRows = [{ step: 'uppercase-message', sum_items_in: 3870, avg_duration_per_item: 5.2e-6 }];

describe('joinProcessorRows', () => {
  it('has one object per processor with its rate and sums', () => {
    expect(joinProcessorRows({ rateRows, sumsRows })).toEqual({
      'uppercase-message': {
        incoming_rate: 4.6,
        sum_items_in: 3870,
        avg_duration_per_item: 5.2e-6,
      },
    });
  });

  it('keeps a processor with items in and no rate row', () => {
    expect(joinProcessorRows({ rateRows: [], sumsRows })).toEqual({
      'uppercase-message': { sum_items_in: 3870, avg_duration_per_item: 5.2e-6 },
    });
  });

  it('has no processors for no rows', () => {
    expect(joinProcessorRows({ rateRows: [], sumsRows: [] })).toEqual({});
  });
});
