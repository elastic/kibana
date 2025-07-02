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
import { AggFunctionsMapping } from '@kbn/data-plugin/public';
import { buildExpressionFunction } from '@kbn/expressions-plugin/public';
import { CARDINALITY_ID, CARDINALITY_NAME } from '@kbn/lens-formula-docs';
import { OperationDefinition, ParamEditorProps } from '.';
import { FieldBasedIndexPatternColumn, ValueFormatConfig } from './column_types';

import {
  getFormatFromPreviousColumn,
  getInvalidFieldMessage,
  getSafeName,
  getFilter,
  isColumnOfType,
} from './helpers';
import { adjustTimeScaleLabelSuffix } from '../time_scale_utils';
import { updateColumnParam } from '../layer_helpers';
import { getColumnReducedTimeRangeError } from '../../reduced_time_range_utils';
import { getGroupByKey } from './get_group_by_key';

const supportedTypes = new Set([
  'string',
  'boolean',
  'number',
  'number_range',
  'ip',
  'ip_range',
  'date',
  'date_range',
  'murmur3',
]);

const SCALE = 'ratio';
const IS_BUCKETED = false;

function ofName(name: string, timeShift: string | undefined, reducedTimeRange: string | undefined) {
  return adjustTimeScaleLabelSuffix(
    i18n.translate('xpack.lens.indexPattern.cardinalityOf', {
      defaultMessage: 'Unique count of {name}',
      values: {
        name,
      },
    }),
    undefined,
    undefined,
    undefined,
    timeShift,
    undefined,
    reducedTimeRange
  );
}

export interface CardinalityIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: typeof CARDINALITY_ID;
  params?: {
    emptyAsNull?: boolean;
    format?: ValueFormatConfig;
  };
}

export const cardinalityOperation: OperationDefinition<
  CardinalityIndexPatternColumn,
  'field',
  {},
  true
> = {
  type: CARDINALITY_ID,
  displayName: CARDINALITY_NAME,
  allowAsReference: true,
  input: 'field',
  getSerializedFormat() {
    return {
      id: 'number',
    };
  },
  getPossibleOperationForField: ({
    aggregationRestrictions,
    aggregatable,
    type,
    timeSeriesMetric,
  }) => {
    if (
      supportedTypes.has(type) &&
      aggregatable &&
      timeSeriesMetric !== 'counter' &&
      (!aggregationRestrictions || aggregationRestrictions.cardinality)
    ) {
      return { dataType: 'number', isBucketed: IS_BUCKETED, scale: SCALE };
    }
  },
  getErrorMessage: (layer, columnId, indexPattern) => [
    ...getInvalidFieldMessage(layer, columnId, indexPattern),
    ...getColumnReducedTimeRangeError(layer, columnId, indexPattern),
  ],
  isTransferable: (column, newIndexPattern) => {
    const newField = newIndexPattern.getFieldByName(column.sourceField);

    return Boolean(
      newField &&
        supportedTypes.has(newField.type) &&
        newField.aggregatable &&
        (!newField.aggregationRestrictions || newField.aggregationRestrictions.cardinality)
    );
  },
  filterable: true,
  shiftable: true,
  canReduceTimeRange: true,
  getDefaultLabel: (column, columns, indexPattern) =>
    ofName(
      getSafeName(column.sourceField, indexPattern),
      column.timeShift,
      column.reducedTimeRange
    ),
  buildColumn({ field, previousColumn }, columnParams) {
    return {
      label: ofName(field.displayName, previousColumn?.timeShift, previousColumn?.reducedTimeRange),
      dataType: 'number',
      operationType: CARDINALITY_ID,
      scale: SCALE,
      sourceField: field.name,
      isBucketed: IS_BUCKETED,
      filter: getFilter(previousColumn, columnParams),
      timeShift: columnParams?.shift || previousColumn?.timeShift,
      reducedTimeRange: columnParams?.reducedTimeRange || previousColumn?.reducedTimeRange,
      params: {
        ...getFormatFromPreviousColumn(previousColumn),
        emptyAsNull:
          previousColumn &&
          isColumnOfType<CardinalityIndexPatternColumn>('unique_count', previousColumn)
            ? previousColumn.params?.emptyAsNull
            : !columnParams?.usedInMath,
      },
    };
  },
  getAdvancedOptions: ({
    layer,
    columnId,
    currentColumn,
    paramEditorUpdater,
  }: ParamEditorProps<CardinalityIndexPatternColumn>) => {
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
  toESQL: (column, columnId) => {
    if (column.params?.emptyAsNull || column.timeShift) return;
    return `COUNT_DISTINCT(${column.sourceField})`;
  },
  toEsAggsFn: (column, columnId) => {
    return buildExpressionFunction<AggFunctionsMapping['aggCardinality']>('aggCardinality', {
      id: columnId,
      enabled: true,
      schema: 'metric',
      field: column.sourceField,
      // time shift is added to wrapping aggFilteredMetric if filter is set
      timeShift: column.filter ? undefined : column.timeShift,
      emptyAsNull: column.params?.emptyAsNull,
    }).toAst();
  },
  getGroupByKey: (agg) => {
    return getGroupByKey(
      agg,
      ['aggCardinality'],
      [{ name: 'field' }, { name: 'emptyAsNull', transformer: (val) => String(Boolean(val)) }]
    );
  },
  onFieldChange: (oldColumn, field) => {
    return {
      ...oldColumn,
      label: ofName(field.displayName, oldColumn.timeShift, oldColumn.reducedTimeRange),
      sourceField: field.name,
    };
  },
  quickFunctionDocumentation: i18n.translate(
    'xpack.lens.indexPattern.cardinality.documentation.quick',
    {
      defaultMessage: `
The number of unique values for a specified number, string, date, or boolean field.
      `,
    }
  ),
};
