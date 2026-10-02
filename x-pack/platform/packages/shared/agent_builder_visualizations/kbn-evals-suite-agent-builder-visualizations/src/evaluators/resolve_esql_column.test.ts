/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { columnsReferToSameExpression } from './resolve_esql_column';

describe('columnsReferToSameExpression', () => {
  const goldQuery = `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Request Count\` = COUNT(*) BY response.keyword`;

  it('matches a gold alias to a differently named actual alias of the same aggregation', () => {
    const actualQuery = `FROM kibana_sample_data_logs
| STATS count = COUNT(*) BY response.keyword`;

    expect(columnsReferToSameExpression('Request Count', goldQuery, 'count', actualQuery)).toBe(
      true
    );
  });

  it('matches a grouping field to its .keyword twin', () => {
    const actualQuery = `FROM kibana_sample_data_logs
| STATS count = COUNT(*) BY response`;

    expect(
      columnsReferToSameExpression('response.keyword', goldQuery, 'response', actualQuery)
    ).toBe(true);
  });

  it('matches a .keyword twin inside an aggregation argument', () => {
    const gold = `FROM kibana_sample_data_logs
| STATS \`Unique URLs\` = COUNT_DISTINCT(url.keyword) BY clientip`;
    const actual = `FROM kibana_sample_data_logs
| STATS urls = COUNT_DISTINCT(url) BY clientip`;

    expect(columnsReferToSameExpression('Unique URLs', gold, 'urls', actual)).toBe(true);
  });

  it('matches a BY alias back to the grouped field', () => {
    const actualQuery = `FROM kibana_sample_data_logs
| STATS count = COUNT(*) BY \`Response Code\` = response.keyword`;

    expect(
      columnsReferToSameExpression('response.keyword', goldQuery, 'Response Code', actualQuery)
    ).toBe(true);
  });

  it('treats COUNT() and COUNT(*) as the same aggregation', () => {
    const actualQuery = 'FROM a | STATS c = COUNT()';

    expect(columnsReferToSameExpression('Request Count', goldQuery, 'c', actualQuery)).toBe(true);
  });

  it('treats DATE_EXTRACT hour-of-day and HOUR() as the same expression', () => {
    const gold = `FROM kibana_sample_data_logs
| EVAL hour = DATE_EXTRACT("HOUR_OF_DAY", @timestamp)
| STATS c = COUNT(*) BY hour, response.keyword`;
    const actual = `FROM kibana_sample_data_logs
| EVAL h = HOUR(@timestamp)
| STATS c = COUNT(*) BY h, response.keyword`;

    expect(columnsReferToSameExpression('hour', gold, 'h', actual)).toBe(true);
  });

  it('treats BUCKET and TBUCKET time buckets as the same axis', () => {
    const gold = `FROM kibana_sample_data_logs
| STATS bytes = SUM(bytes) BY \`Time Bucket\` = BUCKET(@timestamp, 75, ?_tstart, ?_tend)`;
    const actual = `FROM kibana_sample_data_logs
| STATS bytes = SUM(bytes) BY ts = TBUCKET(75, ?_tstart, ?_tend)`;

    expect(columnsReferToSameExpression('Time Bucket', gold, 'ts', actual)).toBe(true);
  });

  it('resolves gold columns against the actual query when the gold has no query', () => {
    const actual = `FROM kibana_sample_data_logs
| STATS \`Total Requests\` = COUNT(*), bytes = SUM(bytes)`;

    expect(columnsReferToSameExpression('Total Requests', '', 'Total Requests', actual)).toBe(true);
    expect(columnsReferToSameExpression('Total Requests', '', 'bytes', actual)).toBe(false);
  });

  it('does not match different aggregations', () => {
    const actualQuery = `FROM kibana_sample_data_logs
| STATS total = SUM(bytes) BY response.keyword`;

    expect(columnsReferToSameExpression('Request Count', goldQuery, 'total', actualQuery)).toBe(
      false
    );
  });

  it('does not match a different grouping field', () => {
    const actualQuery = `FROM kibana_sample_data_logs
| STATS count = COUNT(*) BY host.keyword`;

    expect(
      columnsReferToSameExpression('response.keyword', goldQuery, 'host.keyword', actualQuery)
    ).toBe(false);
  });

  it('does not treat quoted equals or BY as STATS syntax', () => {
    const gold = `FROM kibana_sample_data_logs
| STATS \`x=y\` = COUNT(*) BY \`foo BY bar\` = response.keyword`;
    const actual = `FROM kibana_sample_data_logs
| STATS count = COUNT(*) BY response.keyword`;

    expect(columnsReferToSameExpression('x=y', gold, 'count', actual)).toBe(true);
    expect(columnsReferToSameExpression('foo BY bar', gold, 'response.keyword', actual)).toBe(true);
  });
});
