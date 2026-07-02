/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import { parseInterval } from '@kbn/data-plugin/common';
import type { ExecutionContext } from '@kbn/expressions-plugin/common';
import moment from 'moment-timezone';
import type { DropPartialBucketsTextBasedExpressionFunction } from '../../defs/drop_partial_buckets/types';

/**
 * Mirrors the DSL drop-partials behavior from tabify for ES|QL date histogram columns: a bucket is
 * partial when it starts before the applied time range or ends after it, and those rows are removed
 * so the ES|QL chart data matches the DSL output. Tables without a drop-partials date histogram
 * column are returned unchanged.
 */
export const dropPartialBucketsTextBasedFn =
  (
    getDatatableUtilities: (
      context: ExecutionContext
    ) => DatatableUtilitiesService | Promise<DatatableUtilitiesService>,
    getTimezone: (context: ExecutionContext) => string | Promise<string>
  ): DropPartialBucketsTextBasedExpressionFunction['fn'] =>
  async (input, _args, context) => {
    if (input.rows.length <= 1) {
      return input;
    }

    const contextTimeZone = await getTimezone(context);
    const datatableUtilities = await getDatatableUtilities(context);

    const bucketColumn = (() => {
      for (const column of input.columns) {
        const meta = datatableUtilities.getDateHistogramMeta(column, { timeZone: contextTimeZone });
        if (meta?.dropPartials === true) {
          return { column, meta };
        }
      }
      return undefined;
    })();

    if (!bucketColumn) {
      return input;
    }

    const interval = bucketColumn.meta?.interval
      ? parseInterval(bucketColumn.meta.interval)
      : undefined;

    if (!bucketColumn.meta?.timeRange || !bucketColumn.meta.timeZone || !interval) {
      return input;
    }

    const { timeZone, timeRange } = bucketColumn.meta;
    const from = moment.tz(timeRange.from, timeZone);
    const to = moment.tz(timeRange.to, timeZone);

    const isFullyContained = (bucketStart: moment.Moment) =>
      !bucketStart.isBefore(from) && !bucketStart.clone().add(interval).isAfter(to);

    return {
      ...input,
      rows: input.rows.filter((row) => {
        const bucketStart = row[bucketColumn.column.id];
        return (
          (typeof bucketStart !== 'string' && typeof bucketStart !== 'number') ||
          isFullyContained(moment.tz(bucketStart, timeZone))
        );
      }),
    };
  };
