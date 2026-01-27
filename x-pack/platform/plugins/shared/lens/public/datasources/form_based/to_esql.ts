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
import { isColumnOfType } from './operations/definitions/helpers';
import { convertToAbsoluteDateRange } from '../../utils';
import type { OriginalColumn } from '../../../common/types';
import { operationDefinitionMap } from './operations';
import { resolveTimeShift } from './time_shift_utils';
import type { EsqlConversionFailureReason } from './to_esql_failure_reasons';

// esAggs column ID manipulation functions
export const extractAggId = (id: string) => id.split('.')[0].split('-')[2];

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

/**
 * Result type for getESQLForLayer.
 * Either a successful conversion with the ES|QL query,
 * or a failure with a specific reason.
 */
export type EsqlQueryResult = EsqlQuerySuccess | EsqlQueryFailure;

/**
 * Type guard to check if the result is a successful ES|QL query.
 */
export const isEsqlQuerySuccess = (result: unknown): result is EsqlQuerySuccess =>
  result !== null && typeof result === 'object' && 'success' in result && result.success === true;

/**
 * Helper function to create a consistent failure result for ES|QL query generation.
 */
function getEsqlQueryFailedResult(
  reason: EsqlConversionFailureReason,
  operationType?: string
): EsqlQueryFailure {
  return operationType ? { success: false, reason, operationType } : { success: false, reason };
}

// Need a more complex logic for decimals percentiles

export function getESQLForLayer(
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

  // Check for unsupported column features
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
  const metricsResult: Array<string | EsqlQueryFailure> = metricEsAggsEntries.map(
    ([colId, col], index) => {
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
        wrapInFilter || wrapInTimeFilter ? `${aggId}-metric` : aggId,
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
          return getEsqlQueryFailedResult('unknown');
        }
      }

      return metricESQL;
    }
  );

  // Check for metric failures
  const metricFailure = metricsResult.find(
    (m): m is EsqlQueryFailure => typeof m === 'object' && 'success' in m && !m.success
  );
  if (metricFailure) {
    return metricFailure;
  }

  const metrics = metricsResult as string[];

  // Process buckets
  const bucketsResult: Array<string | EsqlQueryFailure> = bucketEsAggsEntries.map(
    ([colId, col], index) => {
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
        operationDefinitionMap[col.operationType].getSerializedFormat?.(
          col,
          col,
          indexPattern,
          uiSettings,
          dateRange
        ) ??
        ('sourceField' in col ? indexPattern.getFormatterForField(col.sourceField) : undefined);

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
        wrapInFilter || wrapInTimeFilter ? `${aggId}-metric` : aggId,
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

      return `${esAggsId} = ${rawResult.template}`;
    }
  );

  // Check for bucket failures
  const bucketFailure = bucketsResult.find(
    (b): b is EsqlQueryFailure => typeof b === 'object' && 'success' in b && !b.success
  );
  if (bucketFailure) {
    return bucketFailure;
  }

  const buckets = bucketsResult as string[];

  // Merge all params from metrics and buckets
  const allParams = Object.assign({}, queryParams, ...allParamObjects);

  if (buckets.length > 0) {
    if (buckets.some((b) => !b || b.includes('undefined'))) {
      return getEsqlQueryFailedResult('unknown');
    }

    if (metrics.length > 0) {
      const statsBody = `${metrics.join(', ')} BY ${buckets.join(', ')}`;
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
    if (metrics.length > 0) {
      const statsBody = metrics.join(', ');
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
