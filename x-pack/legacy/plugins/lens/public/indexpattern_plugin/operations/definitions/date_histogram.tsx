/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

// TODO: make this new-platform compatible
import { isValidInterval } from 'ui/agg_types/utils';

import {
  EuiForm,
  EuiFormRow,
  EuiSwitch,
  EuiSwitchEvent,
  EuiFieldNumber,
  EuiSelect,
  EuiFlexItem,
  EuiFlexGroup,
  EuiTextColor,
  EuiSpacer,
} from '@elastic/eui';
import { updateColumnParam } from '../../state_helpers';
import { OperationDefinition } from '.';
import { FieldBasedIndexPatternColumn } from './column_types';
import { autoIntervalFromDateRange } from '../../auto_date';
import { AggregationRestrictions } from '../../types';

const autoInterval = 'auto';
const calendarOnlyIntervals = new Set(['w', 'M', 'q', 'y']);

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
    defaultMessage: 'Date histogram',
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
  buildColumn({ suggestedPriority, field }) {
    let interval = autoInterval;
    let timeZone: string | undefined;
    if (field.aggregationRestrictions && field.aggregationRestrictions.date_histogram) {
      interval = restrictedInterval(field.aggregationRestrictions) as string;
      timeZone = field.aggregationRestrictions.date_histogram.time_zone;
    }
    return {
      label: field.name,
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
          interval: restrictedInterval(newField.aggregationRestrictions) as string,
        },
      };
    }

    return column;
  },
  onFieldChange: (oldColumn, indexPattern, field) => {
    return {
      ...oldColumn,
      label: field.name,
      sourceField: field.name,
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
      min_doc_count: 0,
      extended_bounds: {},
    },
  }),
  paramEditor: ({ state, setState, currentColumn: currentColumn, layerId, dateRange }) => {
    const field =
      currentColumn &&
      state.indexPatterns[state.layers[layerId].indexPatternId].fields.find(
        currentField => currentField.name === currentColumn.sourceField
      );
    const intervalIsRestricted =
      field!.aggregationRestrictions && field!.aggregationRestrictions.date_histogram;

    const interval = parseInterval(currentColumn.params.interval);

    // We force the interval value to 1 if it's empty, since that is the ES behavior,
    // and the isValidInterval function doesn't handle the empty case properly. Fixing
    // isValidInterval involves breaking changes in other areas.
    const isValid = isValidInterval(
      `${interval.value === '' ? '1' : interval.value}${interval.unit}`,
      restrictedInterval(field!.aggregationRestrictions)
    );

    function onChangeAutoInterval(ev: EuiSwitchEvent) {
      const value = ev.target.checked ? autoIntervalFromDateRange(dateRange) : autoInterval;
      setState(updateColumnParam({ state, layerId, currentColumn, paramName: 'interval', value }));
    }

    const setInterval = (newInterval: typeof interval) => {
      const isCalendarInterval = calendarOnlyIntervals.has(newInterval.unit);
      const value = `${isCalendarInterval ? '1' : newInterval.value}${newInterval.unit || 'd'}`;

      setState(
        updateColumnParam({
          state,
          layerId,
          currentColumn,
          value,
          paramName: 'interval',
        })
      );
    };

    return (
      <EuiForm>
        {!intervalIsRestricted && (
          <EuiFormRow>
            <EuiSwitch
              label={i18n.translate('xpack.lens.indexPattern.dateHistogram.autoInterval', {
                defaultMessage: 'Customize time interval',
              })}
              checked={currentColumn.params.interval !== autoInterval}
              onChange={onChangeAutoInterval}
            />
          </EuiFormRow>
        )}
        {currentColumn.params.interval !== autoInterval && (
          <EuiFormRow
            label={i18n.translate('xpack.lens.indexPattern.dateHistogram.minimumInterval', {
              defaultMessage: 'Minimum interval',
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
              <>
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiFieldNumber
                      data-test-subj="lensDateHistogramValue"
                      value={interval.value}
                      disabled={calendarOnlyIntervals.has(interval.unit)}
                      isInvalid={!isValid}
                      onChange={e => {
                        setInterval({
                          ...interval,
                          value: e.target.value,
                        });
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiSelect
                      data-test-subj="lensDateHistogramUnit"
                      value={interval.unit}
                      onChange={e => {
                        setInterval({
                          ...interval,
                          unit: e.target.value,
                        });
                      }}
                      isInvalid={!isValid}
                      options={[
                        {
                          value: 'ms',
                          text: i18n.translate(
                            'xpack.lens.indexPattern.dateHistogram.milliseconds',
                            {
                              defaultMessage: 'milliseconds',
                            }
                          ),
                        },
                        {
                          value: 's',
                          text: i18n.translate('xpack.lens.indexPattern.dateHistogram.seconds', {
                            defaultMessage: 'seconds',
                          }),
                        },
                        {
                          value: 'm',
                          text: i18n.translate('xpack.lens.indexPattern.dateHistogram.minutes', {
                            defaultMessage: 'minutes',
                          }),
                        },
                        {
                          value: 'h',
                          text: i18n.translate('xpack.lens.indexPattern.dateHistogram.hours', {
                            defaultMessage: 'hours',
                          }),
                        },
                        {
                          value: 'd',
                          text: i18n.translate('xpack.lens.indexPattern.dateHistogram.days', {
                            defaultMessage: 'days',
                          }),
                        },
                        {
                          value: 'w',
                          text: i18n.translate('xpack.lens.indexPattern.dateHistogram.week', {
                            defaultMessage: 'week',
                          }),
                        },
                        {
                          value: 'M',
                          text: i18n.translate('xpack.lens.indexPattern.dateHistogram.month', {
                            defaultMessage: 'month',
                          }),
                        },
                        // Quarterly intervals appear to be unsupported by esaggs
                        {
                          value: 'y',
                          text: i18n.translate('xpack.lens.indexPattern.dateHistogram.year', {
                            defaultMessage: 'year',
                          }),
                        },
                      ]}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
                {!isValid && (
                  <>
                    <EuiSpacer size="s" />
                    <EuiTextColor color="danger" data-test-subj="lensDateHistogramError">
                      {i18n.translate('xpack.lens.indexPattern.invalidInterval', {
                        defaultMessage: 'Invalid interval value',
                      })}
                    </EuiTextColor>
                  </>
                )}
              </>
            )}
          </EuiFormRow>
        )}
      </EuiForm>
    );
  },
};

function parseInterval(currentInterval: string) {
  const interval = currentInterval || '';
  const valueMatch = interval.match(/[\d]+/) || [];
  const unitMatch = interval.match(/[\D]+/) || [];
  const result = parseInt(valueMatch[0] || '', 10);

  return {
    value: isNaN(result) ? '' : result,
    unit: unitMatch[0] || 'h',
  };
}

function restrictedInterval(aggregationRestrictions?: AggregationRestrictions) {
  if (!aggregationRestrictions || !aggregationRestrictions.date_histogram) {
    return;
  }

  return (
    aggregationRestrictions.date_histogram.calendar_interval ||
    aggregationRestrictions.date_histogram.fixed_interval
  );
}
