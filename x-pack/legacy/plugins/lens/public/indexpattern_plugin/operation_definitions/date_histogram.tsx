/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiForm, EuiFormRow, EuiRange } from '@elastic/eui';
import { IndexPatternField, DateHistogramIndexPatternColumn } from '../indexpattern';
import { DimensionLayer, DimensionPriority } from '../../types';
import { OperationDefinition } from '../operations';
import { updateColumnParam } from '../state_helpers';

type PropType<C> = C extends React.ComponentType<infer P> ? P : unknown;

// Add ticks to EuiRange component props
const FixedEuiRange = (EuiRange as unknown) as React.ComponentType<
  PropType<typeof EuiRange> & {
    ticks?: Array<{
      label: string;
      value: number;
    }>;
  }
>;

function ofName(name: string) {
  return i18n.translate('xpack.lens.indexPattern.dateHistogramOf', {
    defaultMessage: 'Date Histogram of {name}',
    values: { name },
  });
}

export const dateHistogramOperation: OperationDefinition<DateHistogramIndexPatternColumn> = {
  type: 'date_histogram',
  displayName: i18n.translate('xpack.lens.indexPattern.dateHistogram', {
    defaultMessage: 'Date Histogram',
  }),
  isApplicableWithoutField: false,
  isApplicableForField: ({ aggregationRestrictions, type }) => {
    return Boolean(
      type === 'date' && (!aggregationRestrictions || aggregationRestrictions.date_histogram)
    );
  },
  buildColumn(
    operationId: string,
    suggestedOrder: DimensionPriority | undefined,
    layer: DimensionLayer,
    field?: IndexPatternField
  ): DateHistogramIndexPatternColumn {
    if (!field) {
      throw new Error('Invariant error: date histogram operation requires field');
    }
    let interval = 'h';
    let timeZone: string | undefined;
    if (field.aggregationRestrictions && field.aggregationRestrictions.date_histogram) {
      interval = (field.aggregationRestrictions.date_histogram.calendar_interval ||
        field.aggregationRestrictions.date_histogram.fixed_interval) as string;
      timeZone = field.aggregationRestrictions.date_histogram.time_zone;
    }
    return {
      operationId,
      label: ofName(field.name),
      dataType: 'date',
      operationType: 'date_histogram',
      suggestedOrder,
      sourceField: field.name,
      isBucketed: true,
      layer,
      params: {
        interval,
        timeZone,
      },
    };
  },
  toEsAggsConfig: (column, columnId) => ({
    id: columnId,
    enabled: true,
    type: 'date_histogram',
    schema: 'segment',
    params: {
      field: column.sourceField,
      // TODO: This range should be passed in from somewhere else
      timeRange: {
        from: 'now-1d',
        to: 'now',
      },
      time_zone: column.params.timeZone,
      useNormalizedEsInterval: true,
      interval: column.params.interval,
      drop_partials: false,
      min_doc_count: 1,
      extended_bounds: {},
    },
  }),
  paramEditor: ({ state, setState, columnId }) => {
    const column = state.columns[columnId] as DateHistogramIndexPatternColumn;

    const field =
      column &&
      state.indexPatterns[state.currentIndexPatternId].fields.find(
        currentField => currentField.name === column.sourceField
      );
    const intervalIsRestricted =
      field!.aggregationRestrictions && field!.aggregationRestrictions.date_histogram;

    const intervals = ['M', 'w', 'd', 'h'];

    function intervalToNumeric(interval: string) {
      return intervals.indexOf(interval);
    }

    function numericToInterval(i: number) {
      return intervals[i];
    }
    return (
      <EuiForm>
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.dateHistogram.interval', {
            defaultMessage: 'Level of detail',
          })}
        >
          {intervalIsRestricted ? (
            <FormattedMessage
              id="xpack.lens.indexPattern.dateHistogram.restrictedInterval"
              defaultMessage="Interval fixed to {intervalValue} due to aggregation restrictions."
              values={{
                intervalValue: column.params.interval,
              }}
            />
          ) : (
            <FixedEuiRange
              min={0}
              max={intervals.length - 1}
              step={1}
              value={intervalToNumeric(column.params.interval)}
              showTicks
              ticks={intervals.map((interval, index) => ({ label: interval, value: index }))}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setState(
                  updateColumnParam(
                    state,
                    column,
                    'interval',
                    numericToInterval(Number(e.target.value))
                  )
                )
              }
              aria-label={i18n.translate('xpack.lens.indexPattern.dateHistogram.interval', {
                defaultMessage: 'Level of detail',
              })}
            />
          )}
        </EuiFormRow>
      </EuiForm>
    );
  },
};
