/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stripBucketClauseFromQuery } from './strip_bucket_clause_from_query';

describe('stripBucketClauseFromQuery', () => {
  it('correctly removes the tbucket clause from an ESQL query', () => {
    expect(
      stripBucketClauseFromQuery('FROM test-index | STATS count = COUNT(*) BY TBUCKET(1 hour)')
    ).toEqual('FROM test-index | STATS count = COUNT(*)');
  });

  it('correctly removes the bucket clause from an ESQL query', () => {
    expect(
      stripBucketClauseFromQuery(
        'FROM test-index | STATS count = COUNT(*) BY BUCKET(@timestamp, 30s)'
      )
    ).toEqual('FROM test-index | STATS count = COUNT(*)');
  });

  it('correctly removes the bucket clause from an ESQL query with no dimensions', () => {
    expect(
      stripBucketClauseFromQuery(
        'FROM test-index | STATS count = COUNT(*) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)'
      )
    ).toEqual('FROM test-index | STATS count = COUNT(*)');
  });

  it('correctly removes the bucket clause from an ESQL query with one dimension', () => {
    expect(
      stripBucketClauseFromQuery(
        'TS test-index | WHERE important.value IS NOT NULL | STATS count = COUNT(*) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend), important.value | RENAME important.value AS __DIMENSIONS__'
      )
    ).toEqual(
      'TS test-index | WHERE important.value IS NOT NULL | STATS count = COUNT(*) BY important.value | RENAME important.value AS __DIMENSIONS__'
    );
  });

  it('correctly removes the bucket clause from an ESQL query with one dimension - simplified', () => {
    expect(
      stripBucketClauseFromQuery(
        'FROM test-index | STATS count = COUNT(*) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend), important.value'
      )
    ).toEqual('FROM test-index | STATS count = COUNT(*) BY important.value');
  });

  it('correctly removes the bucket clause from an ESQL query with multiple dimensions', () => {
    expect(
      stripBucketClauseFromQuery(
        'FROM test-index | WHERE important.value IS NOT NULL AND second.column IS NOT NULL | STATS count = COUNT(*) BY important.value, BUCKET(@timestamp, 100, ?_tstart, ?_tend), second.column | EVAL __DIMENSIONS__ = CONCAT(important.value, " › ", second.column) | DROP important.value, second.column'
      )
    ).toEqual(
      'FROM test-index | WHERE important.value IS NOT NULL AND second.column IS NOT NULL | STATS count = COUNT(*) BY important.value, second.column | EVAL __DIMENSIONS__ = CONCAT(important.value, " › ", second.column) | DROP important.value, second.column'
    );
  });

  it('correctly removes the bucket clause from an ESQL query with multiple dimensions - simplified', () => {
    expect(
      stripBucketClauseFromQuery(
        'FROM test-index | STATS count = COUNT(*) BY important.value, BUCKET(@timestamp, 100, ?_tstart, ?_tend), second.column'
      )
    ).toEqual('FROM test-index | STATS count = COUNT(*) BY important.value, second.column');
  });

  it('correctly removes the bucket clause from an ESQL query that filters to one value', () => {
    expect(
      stripBucketClauseFromQuery(
        'TS test-index | WHERE important.value IN ("abcdefg") | WHERE important.value IS NOT NULL AND second.column IS NOT NULL | STATS count = COUNT(*) BY important.value, second.column, BUCKET(@timestamp, 100, ?_tstart, ?_tend) | EVAL __DIMENSIONS__ = CONCAT(important.value, " › ", second.column) | DROP important.value, second.column'
      )
    ).toEqual(
      'TS test-index | WHERE important.value IN ("abcdefg") | WHERE important.value IS NOT NULL AND second.column IS NOT NULL | STATS count = COUNT(*) BY important.value, second.column | EVAL __DIMENSIONS__ = CONCAT(important.value, " › ", second.column) | DROP important.value, second.column'
    );
  });

  it('correctly removes the bucket clause from an ESQL query that filters to one value - simplified', () => {
    expect(
      stripBucketClauseFromQuery(
        'TS test-index | WHERE important.value IN ("abcdefg") | STATS count = COUNT(*) BY important.value, second.column, BUCKET(@timestamp, 100, ?_tstart, ?_tend)'
      )
    ).toEqual(
      'TS test-index | WHERE important.value IN ("abcdefg") | STATS count = COUNT(*) BY important.value, second.column'
    );
  });

  it('does not modify query with no bucket clause', () => {
    const query = 'FROM test-index | STATS count = COUNT(*) BY CATEGORIZE(message)';
    expect(stripBucketClauseFromQuery(query)).toEqual(query);
  });

  it('does not modify query with no bucket clause - more complicated query', () => {
    const query =
      'FROM employees | EVAL first_letter = SUBSTRING(first_name, 0, 1) | STATS first_name = MV_SORT(VALUES(first_name)) BY first_letter | SORT first_letter';
    expect(stripBucketClauseFromQuery(query)).toEqual(query);
  });
});
