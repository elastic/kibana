/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment, { Moment } from 'moment-timezone';
import { i18n } from '@kbn/i18n';
import { buildResultColumns, DatatableRow, ExecutionContext } from '@kbn/expressions-plugin/common';
import {
  calculateBounds,
  DatatableUtilitiesService,
  parseInterval,
  TimeRangeBounds,
  TimeRange,
} from '@kbn/data-plugin/common';
import type {
  TimeScaleExpressionFunction,
  TimeScaleUnit,
  TimeScaleArgs,
} from '../../defs/time_scale/types';

const unitInMs: Record<TimeScaleUnit, number> = {
  s: 1000,
  m: 1000 * 60,
  h: 1000 * 60 * 60,
  d: 1000 * 60 * 60 * 24,
};

function safelySetTimeZone(timeZone: string) {
  const zone = moment.tz.zone(timeZone);
  if (zone) moment.tz.setDefault(zone.name);
}

/**
 * This function can be called both from server side and from the client side. Each of them could have
 * a different configured timezone. To be sure the time bounds are computed relative to the same passed timezone,
 * temporarily switch the default moment timezone to the one passed, and switch it back after the calculation is done.
 */
export function getTimeBounds(timeRange: TimeRange, timeZone?: string, getForceNow?: () => Date) {
  if (timeZone) {
    // the `defaultZone` property is injected by moment.timezone.
    // If is not available is it fine to keep undefined because calling setDefault() will automatically reset to default
    // https://github.com/moment/moment-timezone/blob/2448cdcbe15875bc22ddfbc184794d0a6b568b90/moment-timezone.js#L603
    // @ts-expect-error because is not part of the exposed types unfortunately
    const currentDefaultTimeZone = moment.defaultZone?.name;
    safelySetTimeZone(timeZone);
    const timeBounds = calculateBounds(timeRange, { forceNow: getForceNow?.() });
    safelySetTimeZone(currentDefaultTimeZone);
    return timeBounds;
  } else {
    return calculateBounds(timeRange, { forceNow: getForceNow?.() });
  }
}

export const timeScaleFn =
  (
    getDatatableUtilities: (
      context: ExecutionContext
    ) => DatatableUtilitiesService | Promise<DatatableUtilitiesService>,
    getTimezone: (context: ExecutionContext) => string | Promise<string>,
    getForceNow?: () => Date
  ): TimeScaleExpressionFunction['fn'] =>
  async (
    input,
    {
      dateColumnId,
      inputColumnId,
      outputColumnId,
      outputColumnName,
      targetUnit,
      reducedTimeRange,
    }: TimeScaleArgs,
    context
  ) => {
    let timeBounds: TimeRangeBounds | undefined;
    const contextTimeZone = await getTimezone(context);

    let getStartEndOfBucketMeta: (row: DatatableRow) => {
      startOfBucket: Moment;
      endOfBucket: Moment;
    };

    if (dateColumnId) {
      const dateColumnDefinition = input.columns.find((column) => column.id === dateColumnId);

      if (!dateColumnDefinition) {
        throw new Error(
          i18n.translate('xpack.lens.functions.timeScale.dateColumnMissingMessage', {
            defaultMessage: 'Specified dateColumnId {columnId} does not exist.',
            values: {
              columnId: dateColumnId,
            },
          })
        );
      }
      const datatableUtilities = await getDatatableUtilities(context);
      const timeInfo = datatableUtilities.getDateHistogramMeta(dateColumnDefinition, {
        timeZone: contextTimeZone,
      });
      const intervalDuration = timeInfo?.interval && parseInterval(timeInfo.interval);

      timeBounds =
        timeInfo?.timeRange && getTimeBounds(timeInfo.timeRange, timeInfo?.timeZone, getForceNow);

      getStartEndOfBucketMeta = (row) => {
        const startOfBucket = moment.tz(row[dateColumnId], timeInfo?.timeZone ?? contextTimeZone);

        return {
          startOfBucket,
          endOfBucket: startOfBucket.clone().add(intervalDuration),
        };
      };

      if (!timeInfo || !intervalDuration) {
        throw new Error(
          i18n.translate('xpack.lens.functions.timeScale.timeInfoMissingMessage', {
            defaultMessage: 'Could not fetch date histogram information',
          })
        );
      }
    } else {
      const timeRange = context.getSearchContext().timeRange as TimeRange;
      timeBounds = getTimeBounds(timeRange, contextTimeZone, getForceNow);

      if (!timeBounds.max || !timeBounds.min) {
        throw new Error(
          i18n.translate('xpack.lens.functions.timeScale.timeBoundsMissingMessage', {
            defaultMessage: 'Could not parse "Time Range"',
          })
        );
      }

      const endOfBucket = timeBounds.max;
      let startOfBucket = timeBounds.min;

      if (reducedTimeRange) {
        const reducedStartOfBucket = endOfBucket.clone().subtract(parseInterval(reducedTimeRange));

        if (reducedStartOfBucket > startOfBucket) {
          startOfBucket = reducedStartOfBucket;
        }
      }

      getStartEndOfBucketMeta = () => ({
        startOfBucket,
        endOfBucket,
      });
    }

    const resultColumns = buildResultColumns(
      input,
      outputColumnId,
      inputColumnId,
      outputColumnName,
      {
        allowColumnOverwrite: true,
      }
    );

    if (!resultColumns) {
      return input;
    }

    return {
      ...input,
      columns: resultColumns,
      rows: input.rows.map((row) => {
        const newRow = { ...row };

        let { startOfBucket, endOfBucket } = getStartEndOfBucketMeta(row);

        if (timeBounds && timeBounds.min) {
          startOfBucket = moment.max(startOfBucket, timeBounds.min);
        }
        if (timeBounds && timeBounds.max) {
          endOfBucket = moment.min(endOfBucket, timeBounds.max);
        }

        const bucketSize = endOfBucket.diff(startOfBucket);
        const factor = bucketSize / unitInMs[targetUnit];
        const currentValue = newRow[inputColumnId];

        if (currentValue != null) {
          newRow[outputColumnId] = Number(currentValue) / factor;
        }

        return newRow;
      }),
    };
  };
