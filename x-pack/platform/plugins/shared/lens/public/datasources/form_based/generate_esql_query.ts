/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@kbn/esql-language';
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
import type { EsqlConversionFailureReason } from './to_esql_failure_reasons';

// esAggs column ID manipulation functions
export const extractAggId = (id: string) => id.split('.')[0].split('-')[2];

// Used for metrics and buckets ES|QL verification
interface EsqlConversionResult {
  esql: string;
}
type EsqlConversion = EsqlConversionResult | EsqlQueryFailure;
const areValidEsqlConversionItems = (
  metrics: EsqlConversion[]
): metrics is EsqlConversionResult[] => metrics.every((m) => typeof m === 'object' && 'esql' in m);

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

/**
 * Type guard to check if the result is a successful ES|QL query.
 */
export const isEsqlQuerySuccess = (result: unknown): result is EsqlQuerySuccess =>
  result !== null && typeof result === 'object' && 'success' in result && result.success === true;

/**
 * Type guard to check if the result is a failed ES|QL query.
 */
export const isEsqlQueryFailure = (result: unknown): result is EsqlQueryFailure =>
  result !== null && typeof result === 'object' && 'success' in result && result.success === false;

/**
 * Helper function to create a consistent failure result for ES|QL query generation.
 */
function getEsqlQueryFailedResult(
  reason: EsqlConversionFailureReason,
  operationType?: string
): EsqlQueryFailure {
  return operationType ? { success: false, reason, operationType } : { success: false, reason };
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

  // indexPattern.title is the actual ES pattern
  // Build query parts as strings, then combine with esql() for proper parameterization
  // ES|QL composer docs: src/platform/packages/shared/kbn-esql-language/src/composer/README.md
  const queryParts: string[] = [`FROM ${indexPattern.title}`];
  const queryParams: Record<string, string | number> = {};

  if (indexPattern.timeFieldName) {
    // This way we later replace timeFieldName but keep _tstart and _tend as parameters
    queryParts.push(`WHERE ??timeFieldName >= ?_tstart AND ??timeFieldName <= ?_tend`);
    queryParams.timeFieldName = indexPattern.timeFieldName;
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

  // Collect all params from metrics and buckets
  const allParamObjects: Array<Record<string, string | number>> = [];

  // Process metrics
  const metricsResult: EsqlConversion[] = metricEsAggsEntries.map(([colId, col], index) => {
    const def = operationDefinitionMap[col.operationType];

    // Check for specific unsupported operations before general toESQL check
    if (col.operationType === 'formula') {
      return getEsqlQueryFailedResult('formula_not_supported');
    }

    if (!def.toESQL) {
      return getEsqlQueryFailedResult('function_not_supported', col.operationType);
    }

    const aggId = String(index);
    const wrapInFilter = Boolean(def.filterable && col.filter?.query);
    const wrapInTimeFilter =
      def.canReduceTimeRange &&
      !hasDateHistogram &&
      col.reducedTimeRange &&
      indexPattern.timeFieldName;

    if (wrapInTimeFilter) {
      return getEsqlQueryFailedResult('reduced_time_range_not_supported');
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

    const rawResult = def.toESQL(
      {
        ...col,
        timeShift: resolveTimeShift(
          col.timeShift,
          absDateRange,
          histogramBarsTarget,
          hasDateHistogram
        ),
      },
      wrapInFilter || wrapInTimeFilter ? `${colId}-metric` : colId,
      indexPattern,
      layer,
      uiSettings,
      dateRange
    );

    if (!rawResult) {
      return getEsqlQueryFailedResult('function_not_supported', col.operationType);
    }

    if (rawResult.params) {
      allParamObjects.push(rawResult.params);
    }

    let metricESQL = `${esAggsId} = ${rawResult.template}`;

    if (wrapInFilter) {
      if (col.filter?.language === 'kuery') {
        metricESQL += ` WHERE KQL("""${col.filter.query.replace(/"""/g, '')}""")`;
      } else if (col.filter?.language === 'lucene') {
        metricESQL += ` WHERE QSTR("""${col.filter.query.replace(/"""/g, '')}""")`;
      } else {
        return getEsqlQueryFailedResult('function_not_supported', col.operationType);
      }
    }

    return { esql: metricESQL } satisfies EsqlConversionResult;
  });

  // Check for metric conversion errors with a type guard
  if (!areValidEsqlConversionItems(metricsResult)) {
    const metricError = metricsResult.find(isEsqlQueryFailure);
    if (isEsqlQueryFailure(metricError)) {
      return getEsqlQueryFailedResult(
        metricError.reason,
        'operationType' in metricError ? metricError.operationType : undefined
      );
    }
    return getEsqlQueryFailedResult('function_not_supported');
  }

  // Process buckets
  const bucketsResult: EsqlConversion[] = bucketEsAggsEntries.map(([colId, col], index) => {
    const def = operationDefinitionMap[col.operationType];

    // Check for specific unsupported operations before general toESQL check
    if (col.operationType === 'terms') {
      return getEsqlQueryFailedResult('terms_not_supported');
    }

    if (!def.toESQL) {
      return getEsqlQueryFailedResult('function_not_supported', col.operationType);
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
      if (
        column.params?.dropPartials &&
        // set to false when detached from time picker
        (indexPattern.timeFieldName === indexPattern.getFieldByName(column.sourceField)?.name ||
          !column.params?.ignoreTimeRange)
      ) {
        return getEsqlQueryFailedResult('drop_partials_not_supported');
      }

      if (column.params?.includeEmptyRows) {
        return getEsqlQueryFailedResult('include_empty_rows_not_supported');
      }
    }

    const rawResult = def.toESQL(
      {
        ...col,
        timeShift: resolveTimeShift(
          col.timeShift,
          absDateRange,
          histogramBarsTarget,
          hasDateHistogram
        ),
      },
      wrapInFilter || wrapInTimeFilter ? `${colId}-metric` : colId,
      indexPattern,
      layer,
      uiSettings,
      dateRange
    );

    if (!rawResult) {
      return getEsqlQueryFailedResult('function_not_supported', col.operationType);
    }

    if (rawResult.params) {
      allParamObjects.push(rawResult.params);
    }

    return { esql: `${esAggsId} = ${rawResult.template}` };
  });

  // Check for bucket conversion errors with type guard
  if (!areValidEsqlConversionItems(bucketsResult)) {
    const bucketError = bucketsResult.find(isEsqlQueryFailure);
    if (isEsqlQueryFailure(bucketError)) {
      return getEsqlQueryFailedResult(
        bucketError.reason,
        'operationType' in bucketError ? bucketError.operationType : undefined
      );
    }
    return getEsqlQueryFailedResult('function_not_supported');
  }

  // Type assertion after error checks - we know these are all strings now
  const validMetrics = metricsResult.map((m) => m.esql);
  const validBuckets = bucketsResult.map((b) => b.esql);

  // Merge all params from metrics and buckets
  const allParams = Object.assign({}, queryParams, ...allParamObjects);

  if (validBuckets.length > 0) {
    if (validMetrics.length > 0) {
      const statsBody = `${validMetrics.join(', ')} BY ${validBuckets.join(', ')}`;
      queryParts.push(`STATS ${statsBody}`);
    }

    const sortFields = bucketEsAggsEntries.map(([colId, col], index) => {
      const aggId = String(index);
      let esAggsId = window.ELASTIC_LENS_DELAY_SECONDS
        ? `col_${index}-${aggId}`
        : `col_${index}_${aggId}`;

      if (isColumnOfType<DateHistogramIndexPatternColumn>('date_histogram', col)) {
        esAggsId = col.sourceField;
      }

      return `${esAggsId} ASC`;
    });

    queryParts.push(`SORT ${sortFields.join(', ')}`);
  } else {
    if (validMetrics.length > 0) {
      const statsBody = validMetrics.join(', ');
      queryParts.push(`STATS ${statsBody}`);
    }
  }

  try {
    const queryString = queryParts.join(' | ');
    const query =
      Object.keys(allParams).length > 0 ? esql(queryString, allParams) : esql(queryString);

    // Inline parameters to produce final query string with resolved values
    query.inlineParams();

    return {
      success: true,
      esql: query.print(),
      partialRows,
      esAggsIdMap,
    };
  } catch (e) {
    return getEsqlQueryFailedResult('unknown');
  }
}
