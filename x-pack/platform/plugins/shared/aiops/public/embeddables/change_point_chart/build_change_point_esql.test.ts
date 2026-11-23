/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getChangePointOutputColumnNames,
  getChangePointSeriesColumns,
  hasChangePointCommand,
} from '@kbn/esql-utils';
import { buildChangePointEsql } from './build_change_point_esql';

describe('buildChangePointEsql', () => {
  it('returns undefined when required fields are missing or blank', () => {
    expect(
      buildChangePointEsql({
        indexPattern: undefined,
        timeField: '@timestamp',
        aggregationFunction: 'avg',
        metricField: 'bytes',
      })
    ).toBeUndefined();

    expect(
      buildChangePointEsql({
        indexPattern: '   ',
        timeField: '@timestamp',
        aggregationFunction: 'avg',
        metricField: 'bytes',
      })
    ).toBeUndefined();

    expect(
      buildChangePointEsql({
        indexPattern: 'logs-*',
        timeField: undefined,
        aggregationFunction: 'avg',
        metricField: 'bytes',
      })
    ).toBeUndefined();

    expect(
      buildChangePointEsql({
        indexPattern: 'logs-*',
        timeField: '',
        aggregationFunction: 'avg',
        metricField: 'bytes',
      })
    ).toBeUndefined();

    expect(
      buildChangePointEsql({
        indexPattern: 'logs-*',
        timeField: '@timestamp',
        aggregationFunction: 'avg',
        metricField: undefined,
      })
    ).toBeUndefined();

    expect(
      buildChangePointEsql({
        indexPattern: 'logs-*',
        timeField: '@timestamp',
        aggregationFunction: 'avg',
        metricField: '',
      })
    ).toBeUndefined();
  });

  it('builds a base CHANGE_POINT query without split or partitions', () => {
    const query = buildChangePointEsql({
      indexPattern: 'logs-*',
      timeField: '@timestamp',
      aggregationFunction: 'avg',
      metricField: 'bytes',
    });

    expect(query).toBe(
      [
        'FROM logs-*',
        '| WHERE `@timestamp` >= ?_tstart AND `@timestamp` <= ?_tend',
        '| STATS `avg_bytes` = AVG(`bytes`) BY bucket = BUCKET(`@timestamp`, 75, ?_tstart, ?_tend)',
        '| CHANGE_POINT `avg_bytes` ON bucket',
      ].join('\n')
    );
    expect(hasChangePointCommand(query)).toBe(true);
    expect(getChangePointSeriesColumns(query)).toEqual({
      valueColumn: 'avg_bytes',
      timeColumn: 'bucket',
    });
  });

  it('supports all aggregation functions', () => {
    for (const [aggregationFunction, esqlFn] of [
      ['avg', 'AVG'],
      ['sum', 'SUM'],
      ['min', 'MIN'],
      ['max', 'MAX'],
    ] as const) {
      const query = buildChangePointEsql({
        indexPattern: 'metrics-*',
        timeField: '@timestamp',
        aggregationFunction,
        metricField: 'latency',
      });

      expect(query).toContain(
        `| STATS \`${aggregationFunction}_latency\` = ${esqlFn}(\`latency\`)`
      );
      expect(query).toContain(`| CHANGE_POINT \`${aggregationFunction}_latency\` ON bucket`);
    }
  });

  it('adds BY clauses for splitField and omits IN when partitions are empty or omitted', () => {
    const withoutPartitions = buildChangePointEsql({
      indexPattern: 'logs-*',
      timeField: '@timestamp',
      aggregationFunction: 'max',
      metricField: 'bytes',
      splitField: 'host.name',
      partitions: [],
    });

    expect(withoutPartitions).toBe(
      [
        'FROM logs-*',
        '| WHERE `@timestamp` >= ?_tstart AND `@timestamp` <= ?_tend',
        '| STATS `max_bytes` = MAX(`bytes`) BY `host.name`, bucket = BUCKET(`@timestamp`, 75, ?_tstart, ?_tend)',
        '| CHANGE_POINT `max_bytes` ON bucket BY `host.name`',
      ].join('\n')
    );
  });

  it('adds an IN filter when splitField and partitions are provided, and ignores partitions without splitField', () => {
    const withPartitions = buildChangePointEsql({
      indexPattern: 'logs-*',
      timeField: '@timestamp',
      aggregationFunction: 'sum',
      metricField: 'bytes',
      splitField: 'service.name',
      partitions: ['api', 'worker'],
    });

    expect(withPartitions).toBe(
      [
        'FROM logs-*',
        '| WHERE `@timestamp` >= ?_tstart AND `@timestamp` <= ?_tend AND `service.name` IN ("api", "worker")',
        '| STATS `sum_bytes` = SUM(`bytes`) BY `service.name`, bucket = BUCKET(`@timestamp`, 75, ?_tstart, ?_tend)',
        '| CHANGE_POINT `sum_bytes` ON bucket BY `service.name`',
      ].join('\n')
    );

    const withoutSplit = buildChangePointEsql({
      indexPattern: 'logs-*',
      timeField: '@timestamp',
      aggregationFunction: 'sum',
      metricField: 'bytes',
      partitions: ['api'],
    });

    expect(withoutSplit).not.toContain(' IN (');
  });

  it('escapes dotted metric names in the alias and field names containing backticks', () => {
    const query = buildChangePointEsql({
      indexPattern: 'metrics-*',
      timeField: 'event`time',
      aggregationFunction: 'avg',
      metricField: 'system.cpu`pct',
      splitField: 'k8s`pod.name',
    });

    expect(query).toBe(
      [
        'FROM metrics-*',
        '| WHERE `event``time` >= ?_tstart AND `event``time` <= ?_tend',
        '| STATS `avg_system.cpu``pct` = AVG(`system.cpu``pct`) BY `k8s``pod.name`, bucket = BUCKET(`event``time`, 75, ?_tstart, ?_tend)',
        '| CHANGE_POINT `avg_system.cpu``pct` ON bucket BY `k8s``pod.name`',
      ].join('\n')
    );
  });

  it('escapes quotes and backslashes in partition values', () => {
    const query = buildChangePointEsql({
      indexPattern: 'logs-*',
      timeField: '@timestamp',
      aggregationFunction: 'min',
      metricField: 'bytes',
      splitField: 'host.name',
      partitions: ['host-"a"', 'C:\\path\\srv', 'a, b | DROP bytes'],
    });

    expect(query).toContain(
      'AND `host.name` IN ("host-\\"a\\"", "C:\\\\path\\\\srv", "a, b | DROP bytes")'
    );
  });

  it('leaves comma-separated, wildcard, and cross-cluster index patterns unquoted', () => {
    const query = buildChangePointEsql({
      indexPattern: '  logs-*, cluster_one:metrics-*  ',
      timeField: '@timestamp',
      aggregationFunction: 'avg',
      metricField: 'system.cpu.pct',
    });

    expect(query?.startsWith('FROM logs-*, cluster_one:metrics-*\n')).toBe(true);
  });

  it('avoids column collisions with generated metric, bucket, type, and pvalue columns', () => {
    const byMetricAlias = buildChangePointEsql({
      indexPattern: 'logs-*',
      timeField: '@timestamp',
      aggregationFunction: 'avg',
      metricField: 'bytes',
      splitField: 'avg_bytes',
    });

    expect(byMetricAlias).toContain(
      '| STATS `avg_bytes_value` = AVG(`bytes`) BY `avg_bytes`, bucket = BUCKET('
    );
    expect(byMetricAlias).toContain('| CHANGE_POINT `avg_bytes_value` ON bucket BY `avg_bytes`');

    const byBucket = buildChangePointEsql({
      indexPattern: 's3-logs-*',
      timeField: '@timestamp',
      aggregationFunction: 'avg',
      metricField: 'bytes',
      splitField: 'bucket',
    });

    expect(byBucket).toBe(
      [
        'FROM s3-logs-*',
        '| WHERE `@timestamp` >= ?_tstart AND `@timestamp` <= ?_tend',
        '| STATS `avg_bytes` = AVG(`bytes`) BY `bucket`, time_bucket = BUCKET(`@timestamp`, 75, ?_tstart, ?_tend)',
        '| CHANGE_POINT `avg_bytes` ON time_bucket BY `bucket`',
      ].join('\n')
    );

    for (const splitField of ['type', 'pvalue'] as const) {
      const query = buildChangePointEsql({
        indexPattern: 'logs-*',
        timeField: '@timestamp',
        aggregationFunction: 'avg',
        metricField: 'bytes',
        splitField,
      });

      expect(query).toContain(
        `| CHANGE_POINT \`avg_bytes\` ON bucket AS change_point_type, change_point_pvalue BY \`${splitField}\``
      );
    }
  });

  it('appends a WHERE filter for detected change points on default and aliased output columns when onlyChangePoints is true', () => {
    const defaultUnfiltered = buildChangePointEsql({
      indexPattern: 'logs-*',
      timeField: '@timestamp',
      aggregationFunction: 'avg',
      metricField: 'bytes',
      onlyChangePoints: false,
    });
    expect(defaultUnfiltered).not.toContain('IS NOT NULL');

    const defaultFiltered = buildChangePointEsql({
      indexPattern: 'logs-*',
      timeField: '@timestamp',
      aggregationFunction: 'avg',
      metricField: 'bytes',
      onlyChangePoints: true,
    });
    expect(defaultFiltered).toBe(`${defaultUnfiltered}\n| WHERE \`type\` IS NOT NULL`);

    const aliasedFiltered = buildChangePointEsql({
      indexPattern: 'logs-*',
      timeField: '@timestamp',
      aggregationFunction: 'avg',
      metricField: 'bytes',
      splitField: 'type',
      onlyChangePoints: true,
    });
    expect(aliasedFiltered).toContain(
      '| CHANGE_POINT `avg_bytes` ON bucket AS change_point_type, change_point_pvalue BY `type`'
    );
    expect(aliasedFiltered).toContain('| WHERE `change_point_type` IS NOT NULL');
    expect(getChangePointOutputColumnNames(aliasedFiltered)).toEqual({
      typeColumn: 'change_point_type',
      pvalueColumn: 'change_point_pvalue',
    });
  });
});
