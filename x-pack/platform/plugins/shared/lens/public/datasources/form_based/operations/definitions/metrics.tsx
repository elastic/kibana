/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiSwitch, EuiText } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { buildExpressionFunction } from '@kbn/expressions-plugin/public';
import {
  AVG_ID,
  AVG_NAME,
  MAX_ID,
  MAX_NAME,
  MEDIAN_ID,
  MEDIAN_NAME,
  MIN_ID,
  MIN_NAME,
  STD_DEVIATION_ID,
  STD_DEVIATION_NAME,
  SUM_ID,
  SUM_NAME,
} from '@kbn/lens-formula-docs';
import { sanitazeESQLInput } from '@kbn/esql-utils';
import { LayerSettingsFeatures, OperationDefinition, ParamEditorProps } from '.';
import {
  getFormatFromPreviousColumn,
  getInvalidFieldMessage,
  getSafeName,
  getFilter,
  isColumnOfType,
} from './helpers';
import {
  FieldBasedIndexPatternColumn,
  BaseIndexPatternColumn,
  ValueFormatConfig,
} from './column_types';
import { adjustTimeScaleLabelSuffix } from '../time_scale_utils';
import { updateColumnParam } from '../layer_helpers';
import { getColumnReducedTimeRangeError } from '../../reduced_time_range_utils';
import { getGroupByKey } from './get_group_by_key';

type MetricColumn<T> = FieldBasedIndexPatternColumn & {
  operationType: T;
  params?: {
    emptyAsNull?: boolean;
    format?: ValueFormatConfig;
  };
};

const typeToFn: Record<string, string> = {
  min: 'aggMin',
  max: 'aggMax',
  average: 'aggAvg',
  sum: 'aggSum',
  median: 'aggMedian',
  standard_deviation: 'aggStdDeviation',
};

const typeToESQLFn: Record<string, string> = {
  min: 'MIN',
  max: 'MAX',
  average: 'AVG',
  sum: 'SUM',
  median: 'MEDIAN',
  standard_deviation: 'MEDIAN_ABSOLUTE_DEVIATION',
};

const supportedTypes = ['number', 'histogram'];

function isTimeSeriesCompatible(type: string, timeSeriesMetric?: string) {
  return timeSeriesMetric !== 'counter' || ['min', 'max'].includes(type);
}

function buildMetricOperation<T extends MetricColumn<string>>({
  type,
  displayName,
  description,
  ofName,
  priority,
  optionalTimeScaling,
  supportsDate,
  hideZeroOption,
  aggConfigParams,
  quickFunctionDocumentation,
  unsupportedSettings,
}: {
  type: T['operationType'];
  displayName: string;
  ofName: (name: string) => string;
  priority?: number;
  optionalTimeScaling?: boolean;
  description?: string;
  supportsDate?: boolean;
  hideZeroOption?: boolean;
  aggConfigParams?: Record<string, string | number | boolean>;
  documentationDescription?: string;
  quickFunctionDocumentation?: string;
  unsupportedSettings?: LayerSettingsFeatures;
}) {
  const labelLookup = (name: string, column?: BaseIndexPatternColumn) => {
    const label = ofName(name);
    return adjustTimeScaleLabelSuffix(
      label,
      undefined,
      optionalTimeScaling ? column?.timeScale : undefined,
      undefined,
      column?.timeShift,
      undefined,
      column?.reducedTimeRange
    );
  };

  return {
    type,
    allowAsReference: true,
    priority,
    displayName,
    description,
    input: 'field',
    timeScalingMode: optionalTimeScaling ? 'optional' : undefined,
    getUnsupportedSettings: () => unsupportedSettings,
    getPossibleOperationForField: ({
      aggregationRestrictions,
      aggregatable,
      type: fieldType,
      timeSeriesMetric,
    }) => {
      if (
        (supportedTypes.includes(fieldType) || (supportsDate && fieldType === 'date')) &&
        aggregatable &&
        isTimeSeriesCompatible(type, timeSeriesMetric) &&
        (!aggregationRestrictions || aggregationRestrictions[type])
      ) {
        return {
          dataType: fieldType === 'date' ? 'date' : 'number',
          isBucketed: false,
          scale: 'ratio',
        };
      }
    },
    isTransferable: (column, newIndexPattern) => {
      const newField = newIndexPattern.getFieldByName(column.sourceField);
      return Boolean(
        newField &&
          supportedTypes.includes(newField.type) &&
          newField.aggregatable &&
          (!newField.aggregationRestrictions || newField.aggregationRestrictions![type])
      );
    },
    getDefaultLabel: (column, columns, indexPattern) =>
      labelLookup(getSafeName(column.sourceField, indexPattern), column),
    buildColumn: ({ field, previousColumn }, columnParams) => {
      return {
        label: labelLookup(field.displayName, previousColumn),
        dataType: supportsDate && field.type === 'date' ? 'date' : 'number',
        operationType: type,
        sourceField: field.name,
        isBucketed: false,
        scale: 'ratio',
        timeScale: optionalTimeScaling ? previousColumn?.timeScale : undefined,
        filter: getFilter(previousColumn, columnParams),
        timeShift: columnParams?.shift || previousColumn?.timeShift,
        reducedTimeRange: columnParams?.reducedTimeRange || previousColumn?.reducedTimeRange,
        params: {
          ...getFormatFromPreviousColumn(previousColumn),
          emptyAsNull:
            hideZeroOption && previousColumn && isColumnOfType<T>(type, previousColumn)
              ? previousColumn.params?.emptyAsNull
              : !columnParams?.usedInMath,
        },
      } as T;
    },
    onFieldChange: (oldColumn, field) => {
      return {
        ...oldColumn,
        label: labelLookup(field.displayName, oldColumn),
        dataType: field.type,
        sourceField: field.name,
      };
    },
    getAdvancedOptions: ({
      layer,
      columnId,
      currentColumn,
      paramEditorUpdater,
    }: ParamEditorProps<T>) => {
      if (!hideZeroOption) return [];
      return [
        {
          dataTestSubj: 'hide-zero-values',
          inlineElement: (
            <EuiSwitch
              label={
                <EuiText size="xs">
                  {i18n.translate('xpack.lens.indexPattern.hideZero', {
                    defaultMessage: 'Hide zero values',
                  })}
                </EuiText>
              }
              labelProps={{
                style: {
                  fontWeight: euiThemeVars.euiFontWeightMedium,
                },
              }}
              checked={Boolean(currentColumn.params?.emptyAsNull)}
              onChange={() => {
                paramEditorUpdater(
                  updateColumnParam({
                    layer,
                    columnId,
                    paramName: 'emptyAsNull',
                    value: !currentColumn.params?.emptyAsNull,
                  })
                );
              }}
              compressed
            />
          ),
        },
      ];
    },
    toESQL: (column, columnId, _indexPattern, layer) => {
      if (column.timeShift) return;
      if (!typeToESQLFn[type]) return;
      return `${typeToESQLFn[type]}(${sanitazeESQLInput(column.sourceField)})`;
    },
    toEsAggsFn: (column, columnId, _indexPattern) => {
      return buildExpressionFunction(typeToFn[type], {
        id: columnId,
        enabled: true,
        schema: 'metric',
        field: column.sourceField,
        // time shift is added to wrapping aggFilteredMetric if filter is set
        timeShift: column.filter ? undefined : column.timeShift,
        emptyAsNull: hideZeroOption ? column.params?.emptyAsNull : undefined,
        ...aggConfigParams,
      }).toAst();
    },
    getGroupByKey: (agg) => {
      return getGroupByKey(
        agg,
        [typeToFn[type]],
        [{ name: 'field' }, { name: 'emptyAsNull', transformer: (val) => String(Boolean(val)) }]
      );
    },

    getErrorMessage: (layer, columnId, indexPattern) => [
      ...getInvalidFieldMessage(layer, columnId, indexPattern),
      ...getColumnReducedTimeRangeError(layer, columnId, indexPattern),
    ],
    filterable: true,
    canReduceTimeRange: true,
    quickFunctionDocumentation,
    shiftable: true,
  } as OperationDefinition<T, 'field', {}, true>;
}

export type SumIndexPatternColumn = MetricColumn<'sum'>;
export type AvgIndexPatternColumn = MetricColumn<'average'>;
export type StandardDeviationIndexPatternColumn = MetricColumn<'standard_deviation'>;
export type MinIndexPatternColumn = MetricColumn<'min'>;
export type MaxIndexPatternColumn = MetricColumn<'max'>;
export type MedianIndexPatternColumn = MetricColumn<'median'>;

export const minOperation = buildMetricOperation<MinIndexPatternColumn>({
  type: MIN_ID,
  displayName: MIN_NAME,
  ofName: (name) =>
    i18n.translate('xpack.lens.indexPattern.minOf', {
      defaultMessage: 'Minimum of {name}',
      values: { name },
    }),
  description: i18n.translate('xpack.lens.indexPattern.min.description', {
    defaultMessage:
      'A single-value metrics aggregation that returns the minimum value among the numeric values extracted from the aggregated documents.',
  }),
  quickFunctionDocumentation: i18n.translate(
    'xpack.lens.indexPattern.min.quickFunctionDescription',
    {
      defaultMessage: 'The minimum value of a number field.',
    }
  ),
  supportsDate: true,
  unsupportedSettings: { sampling: false },
});

export const maxOperation = buildMetricOperation<MaxIndexPatternColumn>({
  type: MAX_ID,
  displayName: MAX_NAME,
  ofName: (name) =>
    i18n.translate('xpack.lens.indexPattern.maxOf', {
      defaultMessage: 'Maximum of {name}',
      values: { name },
    }),
  description: i18n.translate('xpack.lens.indexPattern.max.description', {
    defaultMessage:
      'A single-value metrics aggregation that returns the maximum value among the numeric values extracted from the aggregated documents.',
  }),
  quickFunctionDocumentation: i18n.translate(
    'xpack.lens.indexPattern.max.quickFunctionDescription',
    {
      defaultMessage: 'The maximum value of a number field.',
    }
  ),
  supportsDate: true,
  unsupportedSettings: { sampling: false },
});

export const averageOperation = buildMetricOperation<AvgIndexPatternColumn>({
  type: AVG_ID,
  priority: 2,
  displayName: AVG_NAME,
  ofName: (name) =>
    i18n.translate('xpack.lens.indexPattern.avgOf', {
      defaultMessage: 'Average of {name}',
      values: { name },
    }),
  description: i18n.translate('xpack.lens.indexPattern.avg.description', {
    defaultMessage:
      'A single-value metric aggregation that computes the average of numeric values that are extracted from the aggregated documents',
  }),
  quickFunctionDocumentation: i18n.translate(
    'xpack.lens.indexPattern.avg.quickFunctionDescription',
    {
      defaultMessage: 'The mean value of a set of number fields.',
    }
  ),
});

export const standardDeviationOperation = buildMetricOperation<StandardDeviationIndexPatternColumn>(
  {
    type: STD_DEVIATION_ID,
    displayName: STD_DEVIATION_NAME,
    ofName: (name) =>
      i18n.translate('xpack.lens.indexPattern.standardDeviationOf', {
        defaultMessage: 'Standard deviation of {name}',
        values: { name },
      }),
    description: i18n.translate('xpack.lens.indexPattern.standardDeviation.description', {
      defaultMessage:
        'A single-value metric aggregation that computes the standard deviation of numeric values that are extracted from the aggregated documents',
    }),
    aggConfigParams: {
      showBounds: false,
    },
    quickFunctionDocumentation: i18n.translate(
      'xpack.lens.indexPattern.standardDeviation.quickFunctionDescription',
      {
        defaultMessage:
          'The standard deviation of the values of a number field which is the amount of variation of the fields values.',
      }
    ),
  }
);

export const sumOperation = buildMetricOperation<SumIndexPatternColumn>({
  type: SUM_ID,
  priority: 1,
  displayName: SUM_NAME,
  ofName: (name) =>
    i18n.translate('xpack.lens.indexPattern.sumOf', {
      defaultMessage: 'Sum of {name}',
      values: { name },
    }),
  optionalTimeScaling: true,
  description: i18n.translate('xpack.lens.indexPattern.sum.description', {
    defaultMessage:
      'A single-value metrics aggregation that sums up numeric values that are extracted from the aggregated documents.',
  }),
  hideZeroOption: true,
  quickFunctionDocumentation: i18n.translate(
    'xpack.lens.indexPattern.sum.quickFunctionDescription',
    {
      defaultMessage: 'The total amount of the values of a number field.',
    }
  ),
});

export const medianOperation = buildMetricOperation<MedianIndexPatternColumn>({
  type: MEDIAN_ID,
  priority: 3,
  displayName: MEDIAN_NAME,
  ofName: (name) =>
    i18n.translate('xpack.lens.indexPattern.medianOf', {
      defaultMessage: 'Median of {name}',
      values: { name },
    }),
  description: i18n.translate('xpack.lens.indexPattern.median.description', {
    defaultMessage:
      'A single-value metrics aggregation that computes the median value that are extracted from the aggregated documents.',
  }),
  quickFunctionDocumentation: i18n.translate(
    'xpack.lens.indexPattern.median.quickFunctionDescription',
    {
      defaultMessage: 'The median value of a number field.',
    }
  ),
});
