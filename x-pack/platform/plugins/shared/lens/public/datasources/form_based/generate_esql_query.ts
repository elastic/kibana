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
import { isColumnOfType, isColumnFormatted } from './operations/definitions/helpers';
import { convertToAbsoluteDateRange } from '../../utils';
import type { OriginalColumn } from '../../../common/types';
import { operationDefinitionMap } from './operations';
import { resolveTimeShift } from './time_shift_utils';

// esAggs column ID manipulation functions
export const extractAggId = (id: string) => id.split('.')[0].split('-')[2];

// Used for metrics and buckets ES|QL verification
interface EsqlResult {
  esql: string;
}

interface EsqlError {
  error: EsqlConversionFailureReason;
  operationType?: string;
}

const isValidEsqlResults = (
  metrics: Array<EsqlResult | EsqlError>
): metrics is Array<EsqlResult> => {
  return metrics.every((m) => typeof m === 'object' && 'esql' in m);
};

/**
 * Specific reasons why ES|QL conversion failed.
 * These are used to provide granular user feedback.
 */
export type EsqlConversionFailureReason =
  | 'non_utc_timezone'
  | 'formula_not_supported'
  | 'time_shift_not_supported'
  | 'runtime_field_not_supported'
  | 'reduced_time_range_not_supported'
  | 'function_not_supported'
  | 'drop_partials_not_supported'
  | 'include_empty_rows_not_supported'
  | 'unknown';

/**
 * Result type for generateEsqlQuery.
 * Either a successful conversion with the ES|QL query,
 * or a failure with a specific reason.
 */
interface EsqlQuerySuccess {
  success: true;
  esql: string;
  partialRows: boolean;
  esAggsIdMap: Record<string, OriginalColumn[]>;
}

interface EsqlQueryFailure {
  success: false;
  reason: EsqlConversionFailureReason;
  operationType?: string;
}

export type EsqlQueryResult = EsqlQuerySuccess | EsqlQueryFailure;

export const isEsqlQuerySuccess = (result: EsqlQueryResult): result is EsqlQuerySuccess =>
  result.success;

/**
 * Helper function to create a consistent failure result for ES|QL query generation.
 */
function getEsqlQueryFailedResult(
  reason: EsqlConversionFailureReason,
  operationType?: string
): EsqlQueryResult {
  if (operationType) {
    return { success: false, reason, operationType };
  }
  return { success: false, reason };
}

export function generateEsqlQuery(
  esAggEntries: Array<readonly [string, GenericIndexPatternColumn]>,
  layer: FormBasedLayer,
  indexPattern: IndexPattern,
  uiSettings: IUiSettingsClient,
  dateRange: DateRange,
  nowInstant: Date
): EsqlQueryResult {
  // esql mode variables
  const partialRows = true;

  const timeZone = getUserTimeZone((key) => uiSettings.get(key), true);
  const utcOffset = moment.tz(timeZone).utcOffset() / 60;
  if (utcOffset !== 0) {
    return getEsqlQueryFailedResult('non_utc_timezone');
  }

  // Check for unsupported column features in layer.columns
  for (const col of Object.values(layer.columns)) {
    if (col.operationType === 'formula') {
      return getEsqlQueryFailedResult('formula_not_supported');
    }
    if (col.timeShift) {
      return getEsqlQueryFailedResult('time_shift_not_supported');
    }
    if ('sourceField' in col && indexPattern.getFieldByName(col.sourceField)?.runtime) {
      return getEsqlQueryFailedResult('runtime_field_not_supported');
    }
  }

  // Also check esAggEntries for unsupported features (in case columns differ)
  for (const [, col] of esAggEntries) {
    if (col.operationType === 'formula') {
      return getEsqlQueryFailedResult('formula_not_supported');
    }
    if (col.timeShift) {
      return getEsqlQueryFailedResult('time_shift_not_supported');
    }
    if ('sourceField' in col && indexPattern.getFieldByName(col.sourceField)?.runtime) {
      return getEsqlQueryFailedResult('runtime_field_not_supported');
    }
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

  const metrics: Array<EsqlResult | EsqlError> = metricEsAggsEntries.map(([colId, col], index) => {
    const def = operationDefinitionMap[col.operationType];

    if (!def.toESQL)
      return { error: 'function_not_supported' as const, operationType: col.operationType };

    const aggId = String(index);
    const wrapInFilter = Boolean(def.filterable && col.filter?.query);
    const wrapInTimeFilter =
      def.canReduceTimeRange &&
      !hasDateHistogram &&
      col.reducedTimeRange &&
      indexPattern.timeFieldName;

    if (wrapInTimeFilter) {
      return { error: 'reduced_time_range_not_supported' as const };
    }

    const esAggsId = window.ELASTIC_LENS_DELAY_SECONDS
      ? `bucket_${index + 1}_${aggId}`
      : `bucket_${index}_${aggId}`;

    const format =
      // 1. User-configured format in Lens (highest priority)
      (isColumnFormatted(col) ? col.params?.format : undefined) ??
      // 2. Operation-specific format
      operationDefinitionMap[col.operationType].getSerializedFormat?.(
        col,
        col,
        indexPattern,
        uiSettings,
        dateRange
      ) ??
      // 3. Field's default format from data view
      ('sourceField' in col
        ? col.sourceField === '___records___'
          ? { id: 'number' }
          : undefined
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

    let esql = def.toESQL(
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

    if (!esql)
      return { error: 'function_not_supported' as const, operationType: col.operationType };

    esql = `${esAggsId} = ${esql}`;

    if (wrapInFilter) {
      if (col.filter?.language === 'kuery') {
        esql += ` WHERE KQL("""${col.filter.query.replace(/"""/g, '')}""")`;
      } else if (col.filter?.language === 'lucene') {
        esql += ` WHERE QSTR("""${col.filter.query.replace(/"""/g, '')}""")`;
      } else {
        return { error: 'function_not_supported' as const, operationType: col.operationType };
      }
    }

    return { esql };
  });

  // Check for metric conversion errors with a type guard
  if (!isValidEsqlResults(metrics)) {
    const metricError = metrics.find((m) => typeof m === 'object' && 'error' in m);
    if (metricError && typeof metricError === 'object' && 'error' in metricError) {
      return getEsqlQueryFailedResult(
        metricError.error,
        'operationType' in metricError ? metricError.operationType : undefined
      );
    }
    return getEsqlQueryFailedResult('function_not_supported');
  }

  const buckets: Array<EsqlResult | EsqlError> = bucketEsAggsEntries.map(([colId, col], index) => {
    const def = operationDefinitionMap[col.operationType];

    if (!def.toESQL)
      return { error: 'function_not_supported' as const, operationType: col.operationType };

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
      // 1. User-configured format in Lens (highest priority)
      (isColumnFormatted(col) ? col.params?.format : undefined) ??
      // 2. Operation-specific format
      operationDefinitionMap[col.operationType].getSerializedFormat?.(
        col,
        col,
        indexPattern,
        uiSettings,
        dateRange
      ) ??
      // 3. Field's default format from data view (buckets don't need fallback)
      undefined;

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
      // Check for includeEmptyRows
      if (column.params?.includeEmptyRows) {
        return { error: 'include_empty_rows_not_supported' as const };
      }
      if (
        column.params?.dropPartials &&
        // set to false when detached from time picker
        (indexPattern.timeFieldName === indexPattern.getFieldByName(column.sourceField)?.name ||
          !column.params?.ignoreTimeRange)
      ) {
        return { error: 'drop_partials_not_supported' as const };
      }
    }

    const esql = def.toESQL(
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

    if (!esql) {
      return { error: 'function_not_supported' as const, operationType: col.operationType };
    }

    return { esql: `${esAggsId} = ${esql}` };
  });

  // Check for bucket conversion errors with type guard
  if (!isValidEsqlResults(buckets)) {
    const bucketError = buckets.find((b) => typeof b === 'object' && 'error' in b);
    if (bucketError && typeof bucketError === 'object' && 'error' in bucketError) {
      return getEsqlQueryFailedResult(
        bucketError.error,
        'operationType' in bucketError ? bucketError.operationType : undefined
      );
    }
    return getEsqlQueryFailedResult('function_not_supported');
  }

  // Type assertion after error checks - we know these are all strings now
  const validMetrics = metrics.map((m) => m.esql);
  const validBuckets = buckets.map((b) => b.esql);

  if (validBuckets.length > 0) {
    if (validMetrics.length > 0) {
      esqlCompose = esqlCompose.pipe(
        stats(`${validMetrics.join(', ')} BY ${validBuckets.join(', ')}`)
      );
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
    if (validMetrics.length > 0) {
      esqlCompose = esqlCompose.pipe(stats(validMetrics.join(', ')));
    }
  }

  try {
    return {
      success: true,
      esql: esqlCompose.toString(),
      partialRows,
      esAggsIdMap,
    };
  } catch (e) {
    return getEsqlQueryFailedResult('unknown');
  }
}
