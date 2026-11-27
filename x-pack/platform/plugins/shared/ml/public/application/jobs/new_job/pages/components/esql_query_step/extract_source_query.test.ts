/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appendTimeFilter } from './extract_source_query';

describe('appendTimeFilter', () => {
  it('filters on the output time column after the rest of the query', () => {
    expect(
      appendTimeFilter(' FROM logs | STATS c = COUNT(*) BY t = BUCKET(@timestamp, 1 hour) ', 't')
    ).toBe(
      'FROM logs | STATS c = COUNT(*) BY t = BUCKET(@timestamp, 1 hour)\n| WHERE `t` >= ?_tstart AND `t` <= ?_tend'
    );
  });

  it('leaves an empty query empty', () => {
    expect(appendTimeFilter('  ', '@timestamp')).toBe('');
  });
});
