/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlQueryWarnings } from './esql_query_warnings';

describe('getEsqlQueryWarnings', () => {
  const timeFields = {
    sourceTimeField: '@timestamp',
    emittedTimeField: '',
    fallbackTimeField: 'bucket',
  };

  it('detects time WHERE, SORT, and numeric LIMIT clauses in a Discover-shaped query', () => {
    expect(
      getEsqlQueryWarnings({
        query: 'FROM logs-* | WHERE @timestamp > now() | SORT @timestamp | LIMIT 100',
        ...timeFields,
      })
    ).toEqual(['where', 'sort', 'limit']);
  });

  it('detects case and whitespace variants including dotted and backtick-quoted time fields', () => {
    expect(
      getEsqlQueryWarnings({
        query:
          'from logs |\n  where `event.ingested` >= now()\n | sort `event.ingested` desc | limit 25',
        sourceTimeField: 'event.ingested',
        emittedTimeField: '',
        fallbackTimeField: 'bucket',
      })
    ).toEqual(['where', 'sort', 'limit']);
  });

  it('treats terminal semicolons as delimiters', () => {
    expect(
      getEsqlQueryWarnings({
        query: 'FROM logs | SORT @timestamp; | LIMIT 100;',
        ...timeFields,
      })
    ).toEqual(['sort', 'limit']);
  });

  it('deduplicates repeated warning kinds in pipeline order', () => {
    expect(
      getEsqlQueryWarnings({
        query:
          'FROM logs | WHERE @timestamp > now() | WHERE @timestamp < now() | LIMIT 100 | LIMIT 200',
        ...timeFields,
      })
    ).toEqual(['where', 'limit']);
  });

  it('ignores clause-like text in comments and string literals', () => {
    expect(
      getEsqlQueryWarnings({
        query:
          'FROM logs // | WHERE @timestamp > now()\n | EVAL note = "SORT @timestamp | LIMIT 10" /* | LIMIT 20 */',
        ...timeFields,
      })
    ).toEqual([]);
  });

  it('only detects WHERE and SORT when their direct field is a configured time field', () => {
    expect(
      getEsqlQueryWarnings({
        query: 'FROM logs | WHERE host == "@timestamp" | SORT host | LIMIT host',
        ...timeFields,
      })
    ).toEqual([]);
  });

  it('uses the selected emitted field', () => {
    expect(
      getEsqlQueryWarnings({
        query: 'FROM logs | SORT event_time',
        sourceTimeField: '',
        emittedTimeField: 'event_time',
        fallbackTimeField: 'bucket',
      })
    ).toEqual(['sort']);
  });

  it('uses the date-output fallback when no emitted field is selected', () => {
    expect(
      getEsqlQueryWarnings({
        query: 'FROM logs | WHERE event_time > now()',
        sourceTimeField: '',
        emittedTimeField: '',
        fallbackTimeField: 'event_time',
      })
    ).toEqual(['where']);
  });

  it('does not flag a blank or raw KEEP query', () => {
    expect(getEsqlQueryWarnings({ query: '', ...timeFields })).toEqual([]);
    expect(
      getEsqlQueryWarnings({
        query: 'FROM logs-* | KEEP @timestamp, host, bytes',
        ...timeFields,
      })
    ).toEqual([]);
  });
});
