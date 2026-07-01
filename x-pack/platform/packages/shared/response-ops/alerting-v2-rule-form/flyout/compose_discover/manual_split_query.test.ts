/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBreachQuery } from '../../form/utils/query_helpers';
import { enterManualSplitQuery, exitManualSplitQuery } from './manual_split_query';

describe('manual split query helpers', () => {
  it('enterManualSplitQuery places the full pipeline in base with an empty alert segment', () => {
    const query = enterManualSplitQuery('FROM logs-* | WHERE count > 100');

    expect(query).toEqual({
      format: 'composed',
      base: 'FROM logs-* | WHERE count > 100',
      breach: { segment: '' },
    });
  });

  it('exitManualSplitQuery stores the combined pipeline for unified editing', () => {
    const query = exitManualSplitQuery('FROM logs-* | WHERE count > 100');

    expect(query).toEqual({
      format: 'composed',
      base: 'FROM logs-* | WHERE count > 100',
      breach: { segment: '' },
    });
    expect(getBreachQuery(query)).toBe('FROM logs-* | WHERE count > 100');
  });
});
