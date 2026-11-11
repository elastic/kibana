/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseMissingData, serializeMissingData } from './missing_data';

describe('missing data metadata', () => {
  it('reads back what it wrote', () => {
    const items = [
      { what: 'SLO definition', source: 'SLO API', why: 'no_access' as const, would_decide: 'x' },
      { what: 'Deploy history' },
    ];

    expect(parseMissingData(serializeMissingData(items))).toEqual(items);
  });

  it('skips entries that are not items and drops an unknown reason', () => {
    expect(
      parseMissingData([
        'not json',
        '42',
        JSON.stringify({ what: '  ' }),
        JSON.stringify({ what: 'Logs', why: 'because' }),
        7,
      ])
    ).toEqual([{ what: 'Logs' }]);
    expect(parseMissingData(undefined)).toEqual([]);
  });
});
