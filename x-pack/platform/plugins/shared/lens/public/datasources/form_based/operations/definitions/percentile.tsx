/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldNumber, EuiRange, EuiRangeProps } from '@elastic/eui';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { AggFunctionsMapping } from '@kbn/data-plugin/public';
import {
  buildExpression,
  buildExpressionFunction,
  ExpressionAstExpressionBuilder,
  ExpressionAstFunctionBuilder,
} from '@kbn/expressions-plugin/public';
import { useDebouncedValue } from '@kbn/visualization-utils';
import { PERCENTILE_ID, PERCENTILE_NAME } from '@kbn/lens-formula-docs';
import { sanitazeESQLInput } from '@kbn/esql-utils';
import { OperationDefinition } from '.';
import {
  getFormatFromPreviousColumn,
  getInvalidFieldMessage,
  getSafeName,
  isValidNumber,
  getFilter,
  isColumnOfType,
} from './helpers';
import { FieldBasedIndexPatternColumn } from './column_types';
import { adjustTimeScaleLabelSuffix } from '../time_scale_utils';
import { FormRow } from './shared_components';
import { getColumnReducedTimeRangeError } from '../../reduced_time_range_utils';
import { getGroupByKey, groupByKey } from './get_group_by_key';

export interface PercentileIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: typeof PERCENTILE_ID;
  params: {
    percentile: number;
    format?: {
      id: string;
      params?: {
        decimals: number;
      };
    };
  };
}

function ofName(
  name: string,
  percentile: number,
  timeShift: string | undefined,
  reducedTimeRange: string | undefined
) {
  return adjustTimeScaleLabelSuffix(
    i18n.translate('xpack.lens.indexPattern.percentileOf', {
      defaultMessage:
        '{percentile, selectordinal, one {#st} two {#nd} few {#rd} other {#th}} percentile of {name}',
      values: { name, percentile },
    }),
    undefined,
    undefined,
    undefined,
    timeShift,
    undefined,
    reducedTimeRange
  );
}

const DEFAULT_PERCENTILE_VALUE = 95;
const ALLOWED_DECIMAL_DIGITS = 4;

function getInvalidErrorMessage(
  value: string | undefined,
  isInline: boolean | undefined,
  max: number,
  min: number
) {
  if (
    !isInline &&
    isValidNumber(
      value,
      false,
      max,
      min,
      15 // max supported digits in JS
    )
  ) {
    return i18n.translate('xpack.lens.indexPattern.percentile.errorMessageTooManyDigits', {
      defaultMessage: 'Only {digits} numbers allowed after the decimal point.',
      values: {
        digits: ALLOWED_DECIMAL_DIGITS,
      },
    });
  }

  return i18n.translate('xpack.lens.indexPattern.percentile.errorMessage', {
    defaultMessage: 'Percentile has to be an integer between {min} and {max}',
    values: {
      min,
      max,
    },
  });
}

const supportedFieldTypes = ['number', 'histogram'];

export const percentileOperation: OperationDefinition<
  PercentileIndexPatternColumn,
  'field',
  { percentile: number },
  true
> = {
  type: PERCENTILE_ID,
  allowAsReference: true,
  displayName: PERCENTILE_NAME,
  input: 'field',
  operationParams: [
    { name: 'percentile', type: 'number', required: false, defaultValue: DEFAULT_PERCENTILE_VALUE },
  ],
  filterable: true,
  shiftable: true,
  canReduceTimeRange: true,
  getPossibleOperationForField: ({
    aggregationRestrictions,
    aggregatable,
    type: fieldType,
    timeSeriesMetric,
  }) => {
    if (
      supportedFieldTypes.includes(fieldType) &&
      aggregatable &&
      timeSeriesMetric !== 'counter' &&
      (!aggregationRestrictions || aggregationRestrictions.percentiles)
    ) {
      return {
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      };
    }
  },
  isTransferable: (column, newIndexPattern) => {
    const newField = newIndexPattern.getFieldByName(column.sourceField);

    return Boolean(
      newField &&
        supportedFieldTypes.includes(newField.type) &&
        newField.aggregatable &&
        (!newField.aggregationRestrictions || !newField.aggregationRestrictions.percentiles)
    );
  },
  getDefaultLabel: (column, columns, indexPattern) =>
    ofName(
      getSafeName(column.sourceField, indexPattern),
      column.params.percentile,
      column.timeShift,
      column.reducedTimeRange
    ),
  buildColumn: ({ field, previousColumn, indexPattern }, columnParams) => {
    const existingPercentileParam =
      previousColumn &&
      isColumnOfType<PercentileIndexPatternColumn>(PERCENTILE_ID, previousColumn) &&
      previousColumn.params.percentile;
    const newPercentileParam =
      columnParams?.percentile ?? (existingPercentileParam || DEFAULT_PERCENTILE_VALUE);
    return {
      label: ofName(
        getSafeName(field.name, indexPattern),
        newPercentileParam,
        previousColumn?.timeShift,
        previousColumn?.reducedTimeRange
      ),
      dataType: 'number',
      operationType: PERCENTILE_ID,
      sourceField: field.name,
      isBucketed: false,
      scale: 'ratio',
      filter: getFilter(previousColumn, columnParams),
      timeShift: columnParams?.shift || previousColumn?.timeShift,
      reducedTimeRange: columnParams?.reducedTimeRange || previousColumn?.reducedTimeRange,
      params: {
        percentile: newPercentileParam,
        ...getFormatFromPreviousColumn(previousColumn),
      },
    };
  },
  onFieldChange: (oldColumn, field) => {
    return {
      ...oldColumn,
      label: ofName(
        field.displayName,
        oldColumn.params.percentile,
        oldColumn.timeShift,
        oldColumn.reducedTimeRange
      ),
      sourceField: field.name,
    };
  },
  toESQL: (column, columnId) => {
    if (column.timeShift) return;
    return `PERCENTILE(${sanitazeESQLInput(column.sourceField)}, ${column.params.percentile})`;
  },
  toEsAggsFn: (column, columnId, _indexPattern) => {
    return buildExpressionFunction<AggFunctionsMapping['aggSinglePercentile']>(
      'aggSinglePercentile',
      {
        id: columnId,
        enabled: true,
        schema: 'metric',
        field: column.sourceField,
        percentile: column.params.percentile,
        // time shift is added to wrapping aggFilteredMetric if filter is set
        timeShift: column.filter ? undefined : column.timeShift,
      }
    ).toAst();
  },

  getGroupByKey: (agg) =>
    getGroupByKey(agg, ['aggSinglePercentile'], [{ name: 'field' }, { name: 'percentile' }]),

  optimizeEsAggs: (_aggs, _esAggsIdMap, aggExpressionToEsAggsIdMap) => {
    let aggs = [..._aggs];
    const esAggsIdMap = { ..._esAggsIdMap };

    const percentileExpressionsByArgs = groupByKey<ExpressionAstExpressionBuilder>(
      aggs,
      (expressionBuilder) =>
        getGroupByKey(
          expressionBuilder,
          ['aggSinglePercentile'],
          // we don't group based on percentile value (just field) since we will put
          // all the percentile values in the final multi-percentile agg
          [{ name: 'field' }]
        )
    );

    const termsFuncs = aggs
      .map((agg) => agg.functions[0])
      .filter((func) => func.name === 'aggTerms') as Array<
      ExpressionAstFunctionBuilder<AggFunctionsMapping['aggTerms']>
    >;

    // collapse each group of matching aggs into a single agg expression
    Object.values(percentileExpressionsByArgs).forEach((expressionBuilders) => {
      if (expressionBuilders.length <= 1) {
        // don't need to optimize if there aren't more than one
        return;
      }

      const {
        functions: [firstFnBuilder],
      } = expressionBuilders[0];

      const isGroupFiltered = firstFnBuilder.name === 'aggFilteredMetric';

      if (isGroupFiltered) {
        // Even though elasticsearch DSL would support this, it doesn't currently work in ESAggs to
        // put an `aggPercentiles` (multiple) as the metric (`customMetric`) arg for
        // an `aggFilteredMetric` expression function
        return;
      }

      // we're going to merge these percentile builders into a single builder, so
      // remove them from the aggs array
      aggs = aggs.filter((aggBuilder) => !expressionBuilders.includes(aggBuilder));

      const {
        functions: [firstPercentileFunction],
      } = expressionBuilders[0];

      const esAggsColumnId = firstPercentileFunction.getArgument('id')![0] as string;
      const aggPercentilesConfig = {
        id: esAggsColumnId,
        enabled: firstPercentileFunction.getArgument('enabled')?.[0] as boolean,
        schema: firstPercentileFunction.getArgument('schema')?.[0] as string,
        field: firstPercentileFunction.getArgument('field')?.[0] as string,
        percents: [] as number[],
        // time shift is added to wrapping aggFilteredMetric if filter is set
        timeShift: firstPercentileFunction.getArgument('timeShift')?.[0] as string,
      };

      for (const builder of expressionBuilders) {
        const percentile = builder.functions[0].getArgument('percentile')![0] as number;

        aggPercentilesConfig.percents!.push(percentile);

        // update any terms order-bys
        termsFuncs.forEach((func) => {
          if (func.getArgument('orderBy')?.[0] === builder.functions[0].getArgument('id')?.[0]) {
            func.replaceArgument('orderBy', [`${esAggsColumnId}.${percentile}`]);
          }
        });
      }

      const multiPercentilesAst = buildExpressionFunction<AggFunctionsMapping['aggPercentiles']>(
        'aggPercentiles',
        aggPercentilesConfig
      ).toAst();

      aggs.push(
        buildExpression({
          type: 'expression',
          chain: [multiPercentilesAst],
        })
      );

      expressionBuilders.forEach((expressionBuilder) => {
        const currentEsAggsId = aggExpressionToEsAggsIdMap.get(expressionBuilder);
        if (currentEsAggsId === undefined) {
          throw new Error('Could not find current column ID for percentile agg expression builder');
        }
        // esAggs appends the percent number to the agg id to make distinct column IDs in the resulting datatable.
        // We're anticipating that here by adding the `.<percentile>`.
        // The agg index will be assigned when we update all the indices in the ID map based on the agg order in the
        // datasource's toExpression fn so we mark it as '?' for now.
        const newEsAggsId = `col-?-${esAggsColumnId}.${
          expressionBuilder.functions[0].getArgument('percentile')![0]
        }`;

        esAggsIdMap[newEsAggsId] = esAggsIdMap[currentEsAggsId];

        delete esAggsIdMap[currentEsAggsId];
      });
    });

    return {
      esAggsIdMap,
      aggs,
    };
  },
  getErrorMessage: (layer, columnId, indexPattern) => [
    ...getInvalidFieldMessage(layer, columnId, indexPattern),
    ...getColumnReducedTimeRangeError(layer, columnId, indexPattern),
  ],
  paramEditor: function PercentileParamEditor({
    paramEditorUpdater,
    currentColumn,
    indexPattern,
    paramEditorCustomProps,
  }) {
    const { labels, isInline } = paramEditorCustomProps || {};
    const percentileLabel =
      labels?.[0] ||
      i18n.translate('xpack.lens.indexPattern.percentile.percentileValue', {
        defaultMessage: 'Percentile',
      });

    const step = isInline ? 1 : 0.0001;
    const upperBound = isInline ? 99 : 99.9999;
    const onChange = useCallback(
      (value?: string) => {
        if (
          !isValidNumber(value, isInline, upperBound, step, ALLOWED_DECIMAL_DIGITS) ||
          Number(value) === currentColumn.params.percentile
        ) {
          return;
        }
        paramEditorUpdater({
          ...currentColumn,
          label: currentColumn.customLabel
            ? currentColumn.label
            : ofName(
                indexPattern.getFieldByName(currentColumn.sourceField)?.displayName ||
                  currentColumn.sourceField,
                Number(value),
                currentColumn.timeShift,
                currentColumn.reducedTimeRange
              ),
          params: {
            ...currentColumn.params,
            percentile: Number(value),
          },
        } as PercentileIndexPatternColumn);
      },
      [isInline, upperBound, step, currentColumn, paramEditorUpdater, indexPattern]
    );
    const { inputValue, handleInputChange: handleInputChangeWithoutValidation } = useDebouncedValue<
      string | undefined
    >({
      onChange,
      value: String(currentColumn.params.percentile),
    });
    const inputValueIsValid = isValidNumber(
      inputValue,
      isInline,
      upperBound,
      step,
      ALLOWED_DECIMAL_DIGITS
    );

    const handleInputChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>(
      (e) => handleInputChangeWithoutValidation(String(e.currentTarget.value)),
      [handleInputChangeWithoutValidation]
    );

    const handleRangeChange = useCallback<NonNullable<EuiRangeProps['onChange']>>(
      (e) => handleInputChangeWithoutValidation(String(e.currentTarget.value)),
      [handleInputChangeWithoutValidation]
    );

    return (
      <FormRow
        isInline={isInline}
        label={percentileLabel}
        data-test-subj="lns-indexPattern-percentile-form"
        display="rowCompressed"
        fullWidth
        isInvalid={!inputValueIsValid}
        error={!inputValueIsValid && getInvalidErrorMessage(inputValue, isInline, upperBound, step)}
      >
        {isInline ? (
          <EuiFieldNumber
            fullWidth
            data-test-subj="lns-indexPattern-percentile-input"
            compressed
            value={inputValue ?? ''}
            min={step}
            max={upperBound}
            step={step}
            onChange={handleInputChange}
            aria-label={percentileLabel}
          />
        ) : (
          <EuiRange
            fullWidth
            data-test-subj="lns-indexPattern-percentile-input"
            compressed
            value={inputValue ?? ''}
            min={step}
            max={upperBound}
            step={step}
            onChange={handleRangeChange}
            showInput
            aria-label={percentileLabel}
          />
        )}
      </FormRow>
    );
  },
  quickFunctionDocumentation: i18n.translate(
    'xpack.lens.indexPattern.percentile.documentation.quick',
    {
      defaultMessage: `
      The largest value that is smaller than n percent of the values that occur in all documents.
      `,
    }
  ),
};
