/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiForm, EuiFormRow, EuiRange, EuiSwitch } from '@elastic/eui';
import { updateColumnParam } from '../../state_helpers';
import { OperationDefinition } from '.';
import { FieldBasedIndexPatternColumn } from './column_types';
import { IndexPattern } from '../../types';

type PropType<C> = C extends React.ComponentType<infer P> ? P : unknown;

const autoInterval = 'auto';
const supportedIntervals = ['M', 'w', 'd', 'h'];
const defaultCustomInterval = supportedIntervals[2];

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

function supportsAutoInterval(fieldName: string, indexPattern: IndexPattern): boolean {
  return indexPattern.timeFieldName ? indexPattern.timeFieldName === fieldName : false;
}

export interface DateHistogramIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'date_histogram';
  params: {
    interval: string;
    timeZone?: string;
  };
}

export const dateHistogramOperation: OperationDefinition<DateHistogramIndexPatternColumn> = {
  type: 'date_histogram',
  displayName: i18n.translate('xpack.lens.indexPattern.dateHistogram', {
    defaultMessage: 'Date Histogram',
  }),
  getPossibleOperationForField: ({ aggregationRestrictions, aggregatable, type }) => {
    if (
      type === 'date' &&
      aggregatable &&
      (!aggregationRestrictions || aggregationRestrictions.date_histogram)
    ) {
      return {
        dataType: 'date',
        isBucketed: true,
        scale: 'interval',
      };
    }
  },
  buildColumn({ suggestedPriority, field, indexPattern }) {
    let interval = indexPattern.timeFieldName === field.name ? autoInterval : defaultCustomInterval;
    let timeZone: string | undefined;
    if (field.aggregationRestrictions && field.aggregationRestrictions.date_histogram) {
      interval = (field.aggregationRestrictions.date_histogram.calendar_interval ||
        field.aggregationRestrictions.date_histogram.fixed_interval) as string;
      timeZone = field.aggregationRestrictions.date_histogram.time_zone;
    }
    return {
      label: ofName(field.name),
      dataType: 'date',
      operationType: 'date_histogram',
      suggestedPriority,
      sourceField: field.name,
      isBucketed: true,
      scale: 'interval',
      params: {
        interval,
        timeZone,
      },
    };
  },
  isTransferable: (column, newIndexPattern) => {
    const newField = newIndexPattern.fields.find(field => field.name === column.sourceField);

    return Boolean(
      newField &&
        newField.type === 'date' &&
        newField.aggregatable &&
        (!newField.aggregationRestrictions || newField.aggregationRestrictions.date_histogram)
    );
  },
  transfer: (column, newIndexPattern) => {
    const newField = newIndexPattern.fields.find(field => field.name === column.sourceField);
    if (
      newField &&
      newField.aggregationRestrictions &&
      newField.aggregationRestrictions.date_histogram
    ) {
      const restrictions = newField.aggregationRestrictions.date_histogram;
      return {
        ...column,
        params: {
          ...column.params,
          timeZone: restrictions.time_zone,
          // TODO this rewrite logic is simplified - if the current interval is a multiple of
          // the restricted interval, we could carry it over directly. However as the current
          // UI does not allow to select multiples of an interval anyway, this is not included yet.
          // If the UI allows to pick more complicated intervals, this should be re-visited.
          interval: (newField.aggregationRestrictions.date_histogram.calendar_interval ||
            newField.aggregationRestrictions.date_histogram.fixed_interval) as string,
        },
      };
    } else {
      return {
        ...column,
        params: {
          ...column.params,
          // TODO remove this once it's possible to specify free intervals instead of picking from a list
          interval: supportedIntervals.includes(column.params.interval)
            ? column.params.interval
            : supportedIntervals[0],
          timeZone: undefined,
        },
      };
    }
  },
  onFieldChange: (oldColumn, indexPattern, field) => {
    return {
      ...oldColumn,
      label: ofName(field.name),
      sourceField: field.name,
      params: {
        ...oldColumn.params,
        // If we have an "auto" interval but the field we're switching to doesn't support auto intervals
        // we use the default custom interval instead
        interval:
          oldColumn.params.interval === 'auto' && !supportsAutoInterval(field.name, indexPattern)
            ? defaultCustomInterval
            : oldColumn.params.interval,
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
      time_zone: column.params.timeZone,
      useNormalizedEsInterval: true,
      interval: column.params.interval,
      drop_partials: false,
      min_doc_count: 1,
      extended_bounds: {},
    },
  }),
  paramEditor: ({ state, setState, currentColumn: currentColumn, layerId }) => {
    const field =
      currentColumn &&
      state.indexPatterns[state.layers[layerId].indexPatternId].fields.find(
        currentField => currentField.name === currentColumn.sourceField
      );
    const intervalIsRestricted =
      field!.aggregationRestrictions && field!.aggregationRestrictions.date_histogram;
    const fieldAllowsAutoInterval =
      state.indexPatterns[state.layers[layerId].indexPatternId].timeFieldName === field!.name;

    function intervalToNumeric(interval: string) {
      return supportedIntervals.indexOf(interval);
    }

    function numericToInterval(i: number) {
      return supportedIntervals[i];
    }

    function onChangeAutoInterval(ev: React.ChangeEvent<HTMLInputElement>) {
      const interval = ev.target.checked ? defaultCustomInterval : autoInterval;
      setState(
        updateColumnParam({ state, layerId, currentColumn, paramName: 'interval', value: interval })
      );
    }

    return (
      <EuiForm>
        {fieldAllowsAutoInterval && (
          <EuiFormRow>
            <EuiSwitch
              label={i18n.translate('xpack.lens.indexPattern.dateHistogram.autoInterval', {
                defaultMessage: 'Customize level of detail',
              })}
              checked={currentColumn.params.interval !== autoInterval}
              onChange={onChangeAutoInterval}
            />
          </EuiFormRow>
        )}
        {currentColumn.params.interval !== autoInterval && (
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
                  intervalValue: currentColumn.params.interval,
                }}
              />
            ) : (
              <FixedEuiRange
                min={0}
                max={supportedIntervals.length - 1}
                step={1}
                value={intervalToNumeric(currentColumn.params.interval)}
                showTicks
                ticks={supportedIntervals.map((interval, index) => ({
                  label: interval,
                  value: index,
                }))}
                onChange={(
                  e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement>
                ) =>
                  setState(
                    updateColumnParam({
                      state,
                      layerId,
                      currentColumn,
                      paramName: 'interval',
                      value: numericToInterval(Number((e.target as HTMLInputElement).value)),
                    })
                  )
                }
                aria-label={i18n.translate('xpack.lens.indexPattern.dateHistogram.interval', {
                  defaultMessage: 'Level of detail',
                })}
              />
            )}
          </EuiFormRow>
        )}
      </EuiForm>
    );
  },
};
