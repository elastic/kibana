/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, where, sort, SortOrder, stats } from '@kbn/esql-composer';
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
  // eslint-disable-next-line no-console
  console.log('[getESQLForLayer] Starting conversion:', {
    esAggEntriesCount: esAggEntries.length,
    indexPatternTitle: indexPattern.title,
    indexPatternId: indexPattern.id,
    hasTimeField: !!indexPattern.timeFieldName,
    timeFieldName: indexPattern.timeFieldName,
    totalColumns: Object.keys(layer.columns).length,
  });

  // esql mode variables
  const partialRows = true;

  const timeZone = getUserTimeZone((key) => uiSettings.get(key), true);
  const utcOffset = moment.tz(timeZone).utcOffset() / 60;
  if (utcOffset !== 0) {
    // eslint-disable-next-line no-console
    console.log('[getESQLForLayer] ❌ Non-UTC timezone detected:', {
      timeZone,
      utcOffset,
      message: 'ES|QL conversion requires UTC timezone',
      fix: 'Set timezone to UTC in Kibana Advanced Settings (dateFormat:tz)',
    });
    return;
  }

  const unsupportedColumn = Object.values(layer.columns).find(
    (col) =>
      col.operationType === 'formula' ||
      col.timeShift ||
      ('sourceField' in col && indexPattern.getFieldByName(col.sourceField)?.runtime)
  );

  if (unsupportedColumn) {
    // eslint-disable-next-line no-console
    console.log('[getESQLForLayer] ❌ Unsupported column operation detected:', {
      columnId: Object.keys(layer.columns).find((k) => layer.columns[k] === unsupportedColumn),
      operationType: unsupportedColumn.operationType,
      hasFormula: unsupportedColumn.operationType === 'formula',
      hasTimeShift: !!unsupportedColumn.timeShift,
      hasRuntimeField:
        'sourceField' in unsupportedColumn &&
        !!indexPattern.getFieldByName(unsupportedColumn.sourceField)?.runtime,
      message: 'This column type is not supported for ES|QL conversion',
    });
    return;
  }

  // indexPattern.title is the actual es pattern
  let esqlCompose = from(indexPattern.title);

  if (indexPattern.timeFieldName) {
    esqlCompose = esqlCompose.pipe(
      where('??timeFieldName >= ?_tstart AND ??timeFieldName <= ?_tend', {
        timeFieldName: indexPattern.timeFieldName,
      })
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

  const metrics = metricEsAggsEntries.map(([colId, col], index) => {
    const def = operationDefinitionMap[col.operationType];

    if (!def.toESQL) return undefined;

    const aggId = String(index);
    const wrapInFilter = Boolean(def.filterable && col.filter?.query);
    const wrapInTimeFilter =
      def.canReduceTimeRange &&
      !hasDateHistogram &&
      col.reducedTimeRange &&
      indexPattern.timeFieldName;

    if (wrapInTimeFilter) {
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

    if (!metricESQL) return undefined;

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
    // eslint-disable-next-line no-console
    console.log('[getESQLForLayer] ❌ One or more metric operations failed to convert:', {
      totalMetrics: metrics.length,
      failedMetrics: metrics.filter((m) => !m).length,
      metricOperations: metricEsAggsEntries.map(([colId, col]) => ({
        columnId: colId,
        operationType: col.operationType,
        hasToESQLMethod: !!operationDefinitionMap[col.operationType]?.toESQL,
      })),
      message: 'Some metric aggregations are not supported for ES|QL conversion',
    });
    return;
  }

  const buckets = bucketEsAggsEntries.map(([colId, col], index) => {
    const def = operationDefinitionMap[col.operationType];

    if (!def.toESQL) return undefined;

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

  if (buckets.some((m) => !m)) {
    // eslint-disable-next-line no-console
    console.log('[getESQLForLayer] ❌ One or more bucket operations failed to convert:', {
      totalBuckets: buckets.length,
      failedBuckets: buckets.filter((m) => !m).length,
      bucketOperations: bucketEsAggsEntries.map(([colId, col]) => ({
        columnId: colId,
        operationType: col.operationType,
        hasToESQLMethod: !!operationDefinitionMap[col.operationType]?.toESQL,
      })),
      message: 'Some bucket aggregations are not supported for ES|QL conversion',
    });
    return;
  }

  if (buckets.length > 0) {
    if (buckets.some((b) => !b || b.includes('undefined'))) {
      // eslint-disable-next-line no-console
      console.log('[getESQLForLayer] ❌ Bucket conversion resulted in undefined values:', {
        buckets,
        message: 'One or more buckets contain undefined or invalid ES|QL expressions',
      });
      return;
    }

    if (metrics.length > 0) {
      esqlCompose = esqlCompose.pipe(stats(`${metrics.join(', ')} BY ${buckets.join(', ')}`));
    }

    const sorts = bucketEsAggsEntries.map(([colId, col], index) => {
      const aggId = String(index);
      let esAggsId = window.ELASTIC_LENS_DELAY_SECONDS
        ? `col_${index}-${aggId}`
        : `col_${index}_${aggId}`;

      if (isColumnOfType<DateHistogramIndexPatternColumn>('date_histogram', col)) {
        esAggsId = col.sourceField;
      }

      return { [esAggsId]: SortOrder.Asc };
    });

    esqlCompose = esqlCompose.pipe(sort(...sorts));
  } else {
    if (metrics.length > 0) {
      esqlCompose = esqlCompose.pipe(stats(metrics.join(', ')));
    }
  }

  try {
    const result = {
      esql: esqlCompose.toString(),
      partialRows,
      esAggsIdMap,
    };

    // eslint-disable-next-line no-console
    console.log('[getESQLForLayer] ✅ Conversion successful:', {
      generatedQuery: result.esql,
      columnMappingsCount: Object.keys(result.esAggsIdMap).length,
      partialRows: result.partialRows,
    });

    return result;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('[getESQLForLayer] ❌ Exception during ES|QL composition:', {
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
      message: 'An error occurred while building the ES|QL query',
    });
    return;
  }
}
