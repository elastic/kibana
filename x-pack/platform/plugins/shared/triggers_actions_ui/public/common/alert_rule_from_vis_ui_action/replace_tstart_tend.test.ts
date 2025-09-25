/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceTStartTend } from './replace_tstart_tend';

describe('replaceTStartTend', () => {
  it('correctly replaces ?_tstart from query with bucket grouping', () => {
    expect(
      replaceTStartTend(
        'FROM test-index | STATS count = COUNT(*) BY BUCKET(@timestamp, 100, ?_tstart, "1986-01-01T00:00:00Z")',
        5,
        'm'
      )
    ).toEqual(
      'FROM test-index | STATS count = COUNT(*) BY BUCKET(@timestamp, 100, NOW() - 5 minutes, "1986-01-01T00:00:00Z")'
    );
  });

  it('correctly replaces ?_end from query with bucket grouping', () => {
    expect(
      replaceTStartTend(
        'FROM test-index | STATS count = COUNT(*) BY BUCKET(@timestamp, 100, "1986-01-01T00:00:00Z", ?_tend)',
        5,
        'm'
      )
    ).toEqual(
      'FROM test-index | STATS count = COUNT(*) BY BUCKET(@timestamp, 100, "1986-01-01T00:00:00Z", NOW())'
    );
  });

  it('correctly replaces ?_tstart and ?_tend from query with bucket grouping', () => {
    expect(
      replaceTStartTend(
        'FROM test-index | STATS count = COUNT(*) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)',
        5,
        'm'
      )
    ).toEqual(
      'FROM test-index | STATS count = COUNT(*) BY BUCKET(@timestamp, 100, NOW() - 5 minutes, NOW())'
    );
  });

  it('correctly replaces ?_tstart and ?_tend from query with bucket grouping - seconds', () => {
    expect(
      replaceTStartTend(
        'FROM test-index | STATS count = COUNT(*) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)',
        22,
        's'
      )
    ).toEqual(
      'FROM test-index | STATS count = COUNT(*) BY BUCKET(@timestamp, 100, NOW() - 22 seconds, NOW())'
    );
  });

  it('correctly replaces ?_tstart and ?_tend from query with bucket grouping - hours', () => {
    expect(
      replaceTStartTend(
        'FROM test-index | STATS count = COUNT(*) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)',
        3,
        'h'
      )
    ).toEqual(
      'FROM test-index | STATS count = COUNT(*) BY BUCKET(@timestamp, 100, NOW() - 3 hours, NOW())'
    );
  });

  it('correctly replaces ?_tstart and ?_tend from query with bucket grouping - days', () => {
    expect(
      replaceTStartTend(
        'FROM test-index | STATS count = COUNT(*) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)',
        4,
        'd'
      )
    ).toEqual(
      'FROM test-index | STATS count = COUNT(*) BY BUCKET(@timestamp, 100, NOW() - 4 days, NOW())'
    );
  });

  it('correctly replaces ?_tstart and ?_tend from query without bucket grouping - days', () => {
    expect(
      replaceTStartTend(
        'FROM test-index | WHERE @timestamp > ?_tstart AND @timestamp < ?_tend | STATS count = COUNT(*)',
        4,
        'd'
      )
    ).toEqual(
      'FROM test-index | WHERE @timestamp > NOW() - 4 days AND @timestamp < NOW() | STATS count = COUNT(*)'
    );
  });

  it('handles null query', () => {
    expect(replaceTStartTend(null, 4, 'd')).toEqual(null);
  });

  it('handles query with no ?_tstart or ?_tend', () => {
    const query = 'FROM test-index | STATS count = COUNT(*)';
    expect(replaceTStartTend(query, 4, 'd')).toEqual(query);
  });

  it('gracefully handles invalid time unit', () => {
    const query = 'FROM test-index | STATS count = COUNT(*)';
    expect(replaceTStartTend(query, 4, 'x')).toEqual(query);
  });
});
