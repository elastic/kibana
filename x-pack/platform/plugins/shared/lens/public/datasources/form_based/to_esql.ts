/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, where, sort, SortOrder, stats as statsComposer } from '@kbn/esql-composer';
import type { IUiSettingsClient } from '@kbn/core/public';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { getCalculateAutoTimeExpression, getUserTimeZone } from '@kbn/data-plugin/common';
import { convertIntervalToEsInterval } from '@kbn/data-plugin/public';
import moment from 'moment';
import { partition } from 'lodash';
import type {
  DateHistogramIndexPatternColumn,
  DateRange,
  FormBasedLayer,
  IndexPattern,
  ValueFormatConfig,
  GenericIndexPatternColumn,
} from '@kbn/lens-common';
import { isColumnOfType } from './operations/definitions/helpers';
import { convertToAbsoluteDateRange } from '../../utils';
import type { OriginalColumn } from '../../../common/types';
import { operationDefinitionMap } from './operations';
import { resolveTimeShift } from './time_shift_utils';

// esAggs column ID manipulation functions
export const extractAggId = (id: string) => id.split('.')[0].split('-')[2];
// Need a more complex logic for decimals percentiles

export function getESQLForLayer(
  esAggEntries: Array<readonly [string, GenericIndexPatternColumn]>,
  layer: FormBasedLayer,
  indexPattern: IndexPattern,
  uiSettings: IUiSettingsClient,
  dateRange: DateRange,
  nowInstant: Date
) {
  // esql mode variables
  const partialRows = true;

  const timeZone = getUserTimeZone((key) => uiSettings.get(key), true);
  const utcOffset = moment.tz(timeZone).utcOffset() / 60;
  if (utcOffset !== 0) {
    console.log('ESQL: no non-UTC support');
    return;
  }

  if (
    Object.values(layer.columns).find(
      (col) =>
        col.operationType === 'formula' ||
        col.timeShift ||
        ('sourceField' in col && indexPattern.getFieldByName(col.sourceField)?.runtime)
    )
  ) {
    console.log('ESQL: no formula, time shift, or runtime fields support');
    return;
  }

  // indexPattern.title is the actual es pattern
  let esqlCompose = from(indexPattern.title);

  const esql = [`FROM ${indexPattern.title}`];
  if (indexPattern.timeFieldName) {
    esql.push(
      `WHERE ${indexPattern.timeFieldName} >= ?_tstart AND ${indexPattern.timeFieldName} <= ?_tend`
    );
    esqlCompose = esqlCompose.pipe(
      where(`${indexPattern.timeFieldName} >= ?_tstart AND ${indexPattern.timeFieldName} <= ?_tend`)
    );
  }

  const histogramBarsTarget = uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET);
  const absDateRange = convertToAbsoluteDateRange(dateRange, nowInstant);

  const firstDateHistogramColumn = esAggEntries.find(
    ([, col]) => col.operationType === 'date_histogram'
  );
  const hasDateHistogram = Boolean(firstDateHistogramColumn);

  const esAggsIdMap: Record<string, OriginalColumn[]> = {};

  const [metricEsAggsEntries, bucketEsAggsEntries] = partition(
    esAggEntries,
    ([_, col]) => !col.isBucketed
  );

  console.log('metricEsAggsEntries LENGTH', metricEsAggsEntries.length);
  const metrics = metricEsAggsEntries.map(([colId, col], index) => {
    const def = operationDefinitionMap[col.operationType];

    if (!def.toESQL) {
      console.log(`ESQL: no toESQL implementation for ${col.operationType}`);
      return undefined;
    }

    const aggId = String(index);
    const wrapInFilter = Boolean(def.filterable && col.filter?.query);
    const wrapInTimeFilter =
      def.canReduceTimeRange &&
      !hasDateHistogram &&
      col.reducedTimeRange &&
      indexPattern.timeFieldName;

    if (wrapInTimeFilter) {
      console.log('ESQL: reducing time range is not supported');
      return undefined;
    }

    const esAggsId = window.ELASTIC_LENS_DELAY_SECONDS
      ? `bucket_${index + 1}_${aggId}`
      : `bucket_${index}_${aggId}`;

    const format =
      operationDefinitionMap[col.operationType].getSerializedFormat?.(
        col,
        col,
        indexPattern,
        uiSettings,
        dateRange
      ) ??
      ('sourceField' in col
        ? col.sourceField === '___records___'
          ? { id: 'number' }
          : indexPattern.getFormatterForField(col.sourceField)
        : undefined);

    esAggsIdMap[esAggsId] = [
      {
        ...col,
        id: colId,
        format: format as unknown as ValueFormatConfig,
        interval: undefined as never,
        label: col.customLabel
          ? col.label
          : operationDefinitionMap[col.operationType].getDefaultLabel(
              col,
              layer.columns,
              indexPattern,
              uiSettings,
              dateRange
            ),
      },
    ];

    let metricESQL = def.toESQL(
      {
        ...col,
        timeShift: resolveTimeShift(
          col.timeShift,
          absDateRange,
          histogramBarsTarget,
          hasDateHistogram
        ),
      },
      wrapInFilter || wrapInTimeFilter ? `${aggId}-metric` : aggId,
      indexPattern,
      layer,
      uiSettings,
      dateRange
    );

    if (!metricESQL) {
      console.log(`ESQL: toESQL returned nothing for ${col.operationType}`);
      return undefined;
    }

    metricESQL = `${esAggsId} = ` + metricESQL;

    if (wrapInFilter) {
      if (col.filter?.language === 'kuery') {
        metricESQL += ` WHERE KQL("""${col.filter.query.replace(/"""/g, '')}""")`;
      } else if (col.filter?.language === 'lucene') {
        metricESQL += ` WHERE QSTR("""${col.filter.query.replace(/"""/g, '')}""")`;
      } else {
        return;
      }
    }

    return metricESQL;
  });

  if (metrics.some((m) => !m)) {
    console.log('ESQL: some metrics could not be converted');
    return;
  }
  console.log('metrics LENGTH', metrics.length);

  const buckets = bucketEsAggsEntries.map(([colId, col], index) => {
    const def = operationDefinitionMap[col.operationType];

    if (!def.toESQL) {
      console.log(`ESQL: no toESQL implementation for ${col.operationType}`);
      return undefined;
    }

    const aggId = String(index);
    const wrapInFilter = Boolean(def.filterable && col.filter?.query);
    const wrapInTimeFilter =
      def.canReduceTimeRange &&
      !hasDateHistogram &&
      col.reducedTimeRange &&
      indexPattern.timeFieldName;

    let esAggsId = window.ELASTIC_LENS_DELAY_SECONDS
      ? `col_${index}-${aggId}`
      : `col_${index}_${aggId}`;

    let interval: number | undefined;
    if (isColumnOfType<DateHistogramIndexPatternColumn>('date_histogram', col)) {
      const dateHistogramColumn = col as DateHistogramIndexPatternColumn;
      const calcAutoInterval = getCalculateAutoTimeExpression((key) => uiSettings.get(key));

      const cleanInterval = (i: string) => {
        switch (i) {
          case 'd':
            return '1d';
          case 'h':
            return '1h';
          case 'm':
            return '1m';
          case 's':
            return '1s';
          case 'ms':
            return '1ms';
          default:
            return i;
        }
      };
      esAggsId = dateHistogramColumn.sourceField;
      const kibanaInterval =
        dateHistogramColumn.params?.interval === 'auto'
          ? calcAutoInterval({ from: dateRange.fromDate, to: dateRange.toDate }) || '1h'
          : dateHistogramColumn.params?.interval || '1h';
      const esInterval = convertIntervalToEsInterval(cleanInterval(kibanaInterval));
      interval = moment.duration(esInterval.value, esInterval.unit).as('ms');
    }

    const format =
      operationDefinitionMap[col.operationType].getSerializedFormat?.(
        col,
        col,
        indexPattern,
        uiSettings,
        dateRange
      ) ?? ('sourceField' in col ? indexPattern.getFormatterForField(col.sourceField) : undefined);

    esAggsIdMap[esAggsId] = [
      {
        ...col,
        id: colId,
        format: format as unknown as ValueFormatConfig,
        interval: interval as never,
        ...('sourceField' in col ? { sourceField: col.sourceField! } : {}),
        label: col.customLabel
          ? col.label
          : operationDefinitionMap[col.operationType].getDefaultLabel(
              col,
              layer.columns,
              indexPattern,
              uiSettings,
              dateRange
            ),
      },
    ];

    if (isColumnOfType<DateHistogramIndexPatternColumn>('date_histogram', col)) {
      const column = col;
      if (
        column.params?.dropPartials &&
        // set to false when detached from time picker
        (indexPattern.timeFieldName === indexPattern.getFieldByName(column.sourceField)?.name ||
          !column.params?.ignoreTimeRange)
      ) {
        return undefined;
      }
    }

    return (
      `${esAggsId} = ` +
      def.toESQL(
        {
          ...col,
          timeShift: resolveTimeShift(
            col.timeShift,
            absDateRange,
            histogramBarsTarget,
            hasDateHistogram
          ),
        },
        wrapInFilter || wrapInTimeFilter ? `${aggId}-metric` : aggId,
        indexPattern,
        layer,
        uiSettings,
        dateRange
      )
    );
  });

  if (buckets.some((m) => !m)) return;

  if (buckets.length > 0) {
    if (metrics.length > 0) {
      const stats = metrics.join(', ');
      esql.push(`STATS ${stats} BY ${buckets.join(', ')}`);
      esqlCompose = esqlCompose.pipe(statsComposer(`${stats} BY ${buckets.join(', ')}`));
    }

    if (buckets.some((b) => !b || b.includes('undefined'))) {
      console.log('ESQL: some buckets could not be converted');
      return;
    }

    const sorts = bucketEsAggsEntries.map(([colId, col], index) => {
      const aggId = String(index);
      let esAggsId = window.ELASTIC_LENS_DELAY_SECONDS
        ? `col_${index}-${aggId}`
        : `col_${index}_${aggId}`;

      if (isColumnOfType<DateHistogramIndexPatternColumn>('date_histogram', col)) {
        esAggsId = col.sourceField;
      }

      return `${esAggsId} ASC`;
    });
    const sortsCompose = bucketEsAggsEntries.map(([colId, col], index) => {
      const aggId = String(index);
      let esAggsId = window.ELASTIC_LENS_DELAY_SECONDS
        ? `col_${index}-${aggId}`
        : `col_${index}_${aggId}`;

      if (isColumnOfType<DateHistogramIndexPatternColumn>('date_histogram', col)) {
        esAggsId = col.sourceField;
      }

      return { [esAggsId]: SortOrder.Asc };
    });

    esql.push(`SORT ${sorts.join(', ')}`);
    esqlCompose = esqlCompose.pipe(sort(...sortsCompose));
  } else {
    if (metrics.length > 0) {
      const stats = metrics.join(', ');
      esql.push(`STATS ${stats}`);
      esqlCompose = esqlCompose.pipe(statsComposer(stats));
    }
  }

  console.log('esql', esqlCompose.toString());

  let finalEsqlCompose;

  try {
    finalEsqlCompose = esqlCompose
      .toString()
      .split(' | ')
      .map((part) => part.trim())
      .join(' | ');
  } catch (e) {
    console.log('==== ESQL-COMPOSER error: error generating final ESQL', e);
    return;
  }

  console.log('OLD SCHOOL ESQL:', esql.join(' | '));
  console.log('NEW SCHOOL ESQL:', finalEsqlCompose);

  return {
    esql: finalEsqlCompose,
    partialRows,
    esAggsIdMap,
  };
}
