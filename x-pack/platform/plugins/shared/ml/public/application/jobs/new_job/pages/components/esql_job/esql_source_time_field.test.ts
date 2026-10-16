/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import { inferSourceTimeField } from './esql_source_time_field';

const column = (name: string, type: string): ESQLFieldWithMetadata =>
  ({ name, type, hasConflict: false, userDefined: false } as ESQLFieldWithMetadata);

const bucketColumns = [
  column('doc_count', 'long'),
  column('host', 'keyword'),
  column('bucket', 'date'),
];

describe('inferSourceTimeField', () => {
  describe('bucketing calls', () => {
    it.each([
      [
        'STATS ... BY bucket = BUCKET(@timestamp, 1 hour)',
        `FROM logs-*\n| STATS doc_count = COUNT(*) BY host, bucket = BUCKET(@timestamp, 1 hour)`,
        '@timestamp',
      ],
      [
        'BUCKET with a target count and ?start/?end params',
        `FROM logs-* | STATS c = COUNT(*) BY BUCKET(@timestamp, 50, ?start, ?end)`,
        '@timestamp',
      ],
      [
        'a non-default dotted field',
        `FROM logs-* | STATS c = COUNT(*) BY b = BUCKET(event.ingested, 15 minutes)`,
        'event.ingested',
      ],
      [
        'DATE_TRUNC(<interval>, <field>)',
        `FROM logs-* | STATS c = COUNT(*) BY b = DATE_TRUNC(1 hour, event.created)`,
        'event.created',
      ],
      [
        'DATE_TRUNC in EVAL followed by STATS',
        `FROM logs-* | EVAL b = DATE_TRUNC(1 day, ts) | STATS c = COUNT(*) BY b`,
        'ts',
      ],
      [
        'TBUCKET (implicit @timestamp)',
        `FROM logs-* | STATS c = COUNT(*) BY b = TBUCKET(1 hour)`,
        '@timestamp',
      ],
      [
        'lower/mixed-case function names',
        `from logs-* | stats c = count(*) by b = Bucket(ts, 1 hour)`,
        'ts',
      ],
      [
        'backtick-quoted identifiers',
        'FROM logs-* | STATS c = COUNT(*) BY b = BUCKET(`event`.`ingested`, 1 hour)',
        'event.ingested',
      ],
      [
        'a backtick-quoted name containing a dot',
        'FROM logs-* | STATS c = COUNT(*) BY b = BUCKET(`my.time`, 1 hour)',
        'my.time',
      ],
    ])('%s', (_label, query, expected) => {
      expect(inferSourceTimeField(query, bucketColumns)).toBe(expected);
    });

    it('takes the first top-level call when several are present', () => {
      const query = `FROM logs-* | STATS c = COUNT(*) BY a = BUCKET(first_ts, 1 hour), b = BUCKET(second_ts, 1 day)`;

      expect(inferSourceTimeField(query, bucketColumns)).toBe('first_ts');
    });

    it('ignores bucketing calls inside line and block comments and string literals', () => {
      const query = [
        '// STATS BY BUCKET(commented_out, 1 hour)',
        'FROM logs-* /* BUCKET(also_commented, 1 hour) */',
        '| WHERE message == "BUCKET(in_a_string, 1 hour)"',
        '| STATS c = COUNT(*) BY b = BUCKET(real_ts, 1 hour)',
      ].join('\n');

      expect(inferSourceTimeField(query, bucketColumns)).toBe('real_ts');
    });

    it('returns undefined when the bucketed argument is not a plain identifier', () => {
      const query = `FROM logs-* | STATS c = COUNT(*) BY b = BUCKET(TO_DATETIME(ts_string), 1 hour)`;

      expect(inferSourceTimeField(query, bucketColumns)).toBeUndefined();
    });

    it('returns undefined when the bucketed field was derived by EVAL or RENAME', () => {
      expect(
        inferSourceTimeField(
          `FROM logs-* | EVAL t = @timestamp | STATS c = COUNT(*) BY b = BUCKET(t, 1 hour)`,
          bucketColumns
        )
      ).toBeUndefined();
      expect(
        inferSourceTimeField(
          `FROM logs-* | RENAME @timestamp AS t | STATS c = COUNT(*) BY b = BUCKET(t, 1 hour)`,
          bucketColumns
        )
      ).toBeUndefined();
    });
  });

  describe('passthrough queries without aggregation', () => {
    it('uses the single date column (KEEP passthrough)', () => {
      const columns = [column('@timestamp', 'date'), column('host', 'keyword')];

      expect(inferSourceTimeField(`FROM logs-* | KEEP @timestamp, host | LIMIT 100`, columns)).toBe(
        '@timestamp'
      );
    });

    it('accepts a date_nanos column', () => {
      const columns = [column('ts', 'date_nanos'), column('host', 'keyword')];

      expect(inferSourceTimeField(`FROM logs-* | KEEP ts, host`, columns)).toBe('ts');
    });

    it('returns undefined with multiple date columns', () => {
      const columns = [column('@timestamp', 'date'), column('event.ingested', 'date')];

      expect(
        inferSourceTimeField(`FROM logs-* | KEEP @timestamp, event.ingested`, columns)
      ).toBeUndefined();
    });

    it('returns undefined with no date column', () => {
      expect(
        inferSourceTimeField(`FROM logs-* | KEEP host`, [column('host', 'keyword')])
      ).toBeUndefined();
    });

    it('returns undefined when the only date column is renamed via EVAL', () => {
      const columns = [column('ts', 'date'), column('host', 'keyword')];

      expect(
        inferSourceTimeField(`FROM logs-* | EVAL ts = @timestamp | KEEP ts, host`, columns)
      ).toBeUndefined();
    });

    it('returns undefined when the only date column is renamed via RENAME', () => {
      const columns = [column('ts', 'date'), column('host', 'keyword')];

      expect(
        inferSourceTimeField(`FROM logs-* | RENAME @timestamp AS ts | KEEP ts, host`, columns)
      ).toBeUndefined();
    });

    it('returns undefined for an aggregated query without a bucketing call', () => {
      const columns = [column('latest', 'date'), column('host', 'keyword')];

      expect(
        inferSourceTimeField(`FROM logs-* | STATS latest = MAX(@timestamp) BY host`, columns)
      ).toBeUndefined();
    });
  });

  it('returns undefined for an empty query', () => {
    expect(inferSourceTimeField('', [])).toBeUndefined();
    expect(inferSourceTimeField('   // only a comment', [])).toBeUndefined();
  });
});
