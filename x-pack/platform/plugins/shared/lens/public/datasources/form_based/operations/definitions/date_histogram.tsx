/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiBasicTable,
  EuiCode,
  EuiComboBox,
  EuiFormRow,
  EuiIconTip,
  EuiSwitch,
  EuiSwitchEvent,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import {
  AggFunctionsMapping,
  AggParamOption,
  IndexPatternAggRestrictions,
  search,
  UI_SETTINGS,
} from '@kbn/data-plugin/public';
import {
  extendedBoundsToAst,
  intervalOptions,
  getCalculateAutoTimeExpression,
} from '@kbn/data-plugin/common';
import { buildExpressionFunction } from '@kbn/expressions-plugin/public';
import { TooltipWrapper } from '@kbn/visualization-utils';
import { sanitazeESQLInput } from '@kbn/esql-utils';
import { DateRange } from '../../../../../common/types';
import { IndexPattern } from '../../../../types';
import { updateColumnParam } from '../layer_helpers';
import { FieldBasedOperationErrorMessage, OperationDefinition, ParamEditorProps } from '.';
import { FieldBasedIndexPatternColumn } from './column_types';
import { getInvalidFieldMessage, getSafeName } from './helpers';
import { FormBasedLayer } from '../../types';
import { TIME_SHIFT_MULTIPLE_DATE_HISTOGRAMS } from '../../../../user_messages_ids';

const { isValidInterval } = search.aggs;
const autoInterval = 'auto';
const calendarOnlyIntervals = new Set(['w', 'M', 'q', 'y']);

export interface DateHistogramIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'date_histogram';
  params: {
    interval: string;
    ignoreTimeRange?: boolean;
    includeEmptyRows?: boolean;
    dropPartials?: boolean;
  };
}

function getMultipleDateHistogramsErrorMessage(
  layer: FormBasedLayer,
  columnId: string
): FieldBasedOperationErrorMessage[] {
  const usesTimeShift = Object.values(layer.columns).some(
    (col) => col.timeShift && col.timeShift !== ''
  );
  if (!usesTimeShift) {
    return [];
  }
  const dateHistograms = layer.columnOrder.filter(
    (colId) => layer.columns[colId].operationType === 'date_histogram'
  );
  if (dateHistograms.length < 2) {
    return [];
  }
  return [
    {
      uniqueId: TIME_SHIFT_MULTIPLE_DATE_HISTOGRAMS,
      message: i18n.translate('xpack.lens.indexPattern.multipleDateHistogramsError', {
        defaultMessage:
          '"{dimensionLabel}" is not the only date histogram. When using time shifts, make sure to only use one date histogram.',
        values: {
          dimensionLabel: layer.columns[columnId].label,
        },
      }),
    },
  ];
}

function getTimeZoneAndInterval(
  column: DateHistogramIndexPatternColumn,
  indexPattern: IndexPattern
) {
  const usedField = indexPattern.getFieldByName(column.sourceField);

  if (
    usedField &&
    usedField.aggregationRestrictions &&
    usedField.aggregationRestrictions.date_histogram
  ) {
    return {
      interval: restrictedInterval(usedField.aggregationRestrictions) ?? autoInterval,
      timeZone: usedField.aggregationRestrictions.date_histogram.time_zone,
      usedField,
    };
  }
  return {
    usedField: undefined,
    timeZone: undefined,
    interval: column.params?.interval ?? autoInterval,
  };
}

export function mapToEsqlInterval(dateRange: DateRange, interval: string) {
  if (interval !== 'm' && interval.endsWith('m')) {
    return interval.replace('m', ' minutes');
  }
  switch (interval) {
    case '1M':
      return '1 month';
    case 'd':
      return '1d';
    case 'h':
      return '1h';
    case 'm':
      return '1 minute';
    case 's':
      return '1s';
    case 'ms':
      return '1ms';
    default:
      return interval;
  }
}

export const dateHistogramOperation: OperationDefinition<
  DateHistogramIndexPatternColumn,
  'field',
  { interval: string; dropPartials?: boolean; includeEmptyRows?: boolean }
> = {
  type: 'date_histogram',
  displayName: i18n.translate('xpack.lens.indexPattern.dateHistogram', {
    defaultMessage: 'Date histogram',
  }),
  input: 'field',
  priority: 5, // Highest priority level used
  operationParams: [{ name: 'interval', type: 'string', required: false }],
  getErrorMessage: (layer, columnId, indexPattern) => [
    ...getInvalidFieldMessage(layer, columnId, indexPattern),
    ...getMultipleDateHistogramsErrorMessage(layer, columnId),
  ],
  getPossibleOperationForField: ({ aggregationRestrictions, aggregatable, type }) => {
    if (
      (type === 'date' || type === 'date_range') &&
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
  getDefaultLabel: (column, columns, indexPattern, uiSettings, dateRange) => {
    const field = getSafeName(column.sourceField, indexPattern);
    let interval = column.params?.interval || autoInterval;
    if (dateRange && uiSettings) {
      const calcAutoInterval = getCalculateAutoTimeExpression((key) => uiSettings.get(key));
      interval =
        calcAutoInterval({ from: dateRange.fromDate, to: dateRange.toDate }, interval, false)
          ?.description || 'hour';
      return i18n.translate('xpack.lens.indexPattern.dateHistogram.interval', {
        defaultMessage: `{field} per {interval}`,
        values: {
          field: field || '',
          interval,
        },
      });
    }
    return field;
  },
  buildColumn({ field }, columnParams) {
    return {
      label: field.displayName,
      dataType: 'date',
      operationType: 'date_histogram',
      sourceField: field.name,
      isBucketed: true,
      scale: 'interval',
      params: {
        interval: columnParams?.interval ?? autoInterval,
        includeEmptyRows: columnParams?.includeEmptyRows ?? true,
        dropPartials: Boolean(columnParams?.dropPartials),
      },
    };
  },
  isTransferable: (column, newIndexPattern) => {
    const newField = newIndexPattern.getFieldByName(column.sourceField);

    return Boolean(
      newField &&
        newField.type === 'date' &&
        newField.aggregatable &&
        (!newField.aggregationRestrictions || newField.aggregationRestrictions.date_histogram)
    );
  },
  onFieldChange: (oldColumn, field) => {
    return {
      ...oldColumn,
      label: field.displayName,
      sourceField: field.name,
    };
  },
  getSerializedFormat: (column, targetColumn, indexPattern, uiSettings, dateRange) => {
    if (!indexPattern || !dateRange || !uiSettings)
      return {
        id: 'date',
      };
    const { interval } = getTimeZoneAndInterval(column, indexPattern);
    const calcAutoInterval = getCalculateAutoTimeExpression((key) => uiSettings.get(key));
    const usedInterval =
      calcAutoInterval(
        { from: dateRange.fromDate, to: dateRange.toDate },
        interval,
        false
      )?.asMilliseconds() || 3600000;
    const rules = uiSettings?.get('dateFormat:scaled');
    for (let i = rules.length - 1; i >= 0; i--) {
      const rule = rules[i];
      if (!Array.isArray(rule) || rule.length !== 2) continue;
      if (!rule[0] || (usedInterval && usedInterval >= moment.duration(rule[0]).asMilliseconds())) {
        return { id: 'date', params: { pattern: rule[1] } };
      }
    }
    return { id: 'date', params: { pattern: uiSettings?.get('dateFormat') } };
  },
  toESQL: (column, columnId, indexPattern, layer, uiSettings, dateRange) => {
    if (column.params?.includeEmptyRows) return;
    const { interval } = getTimeZoneAndInterval(column, indexPattern);
    const calcAutoInterval = getCalculateAutoTimeExpression((key) => uiSettings.get(key));

    if (interval === 'auto') {
      return `BUCKET(${sanitazeESQLInput(column.sourceField)}, ${mapToEsqlInterval(
        dateRange,
        calcAutoInterval({ from: dateRange.fromDate, to: dateRange.toDate }) || '1h'
      )})`;
    }
    return `BUCKET(${sanitazeESQLInput(column.sourceField)}, ${mapToEsqlInterval(
      dateRange,
      interval
    )})`;
  },
  toEsAggsFn: (column, columnId, indexPattern) => {
    const { usedField, timeZone, interval } = getTimeZoneAndInterval(column, indexPattern);
    const dropPartials = Boolean(
      column.params?.dropPartials &&
        // set to false when detached from time picker
        (indexPattern.timeFieldName === usedField?.name || !column.params?.ignoreTimeRange)
    );

    return buildExpressionFunction<AggFunctionsMapping['aggDateHistogram']>('aggDateHistogram', {
      id: columnId,
      enabled: true,
      schema: 'segment',
      field: column.sourceField,
      time_zone: timeZone,
      useNormalizedEsInterval: !usedField?.aggregationRestrictions?.date_histogram,
      interval,
      drop_partials: dropPartials,
      min_doc_count: column.params?.includeEmptyRows ? 0 : 1,
      extended_bounds: extendedBoundsToAst({}),
      extendToTimeRange: column.params?.includeEmptyRows,
    }).toAst();
  },
  paramEditor: function ParamEditor({
    layer,
    columnId,
    currentColumn,
    paramEditorUpdater,
    dateRange,
    data,
    indexPattern,
  }: ParamEditorProps<DateHistogramIndexPatternColumn>) {
    const field = currentColumn && indexPattern.getFieldByName(currentColumn.sourceField);
    const intervalIsRestricted =
      field!.aggregationRestrictions && field!.aggregationRestrictions.date_histogram;

    const [intervalInput, setIntervalInput] = useState(currentColumn.params.interval);
    const interval = intervalInput === autoInterval ? autoInterval : parseInterval(intervalInput);

    // We force the interval value to 1 if it's empty, since that is the ES behavior,
    // and the isValidInterval function doesn't handle the empty case properly. Fixing
    // isValidInterval involves breaking changes in other areas.
    const isValid =
      (!currentColumn.params.ignoreTimeRange && intervalInput === autoInterval) ||
      (interval !== autoInterval &&
        intervalInput !== '' &&
        isValidInterval(
          `${interval.value === '' ? '1' : interval.value}${interval.unit}`,
          restrictedInterval(field!.aggregationRestrictions)
        ));

    const onChangeDropPartialBuckets = useCallback(
      (ev: EuiSwitchEvent) => {
        // updateColumnParam will be called async
        // store the checked value before the event pooling clears it
        const value = ev.target.checked;
        paramEditorUpdater((newLayer) =>
          updateColumnParam({
            layer: newLayer,
            columnId,
            paramName: 'dropPartials',
            value,
          })
        );
      },
      [columnId, paramEditorUpdater]
    );

    const setInterval = useCallback(
      (newInterval: typeof interval) => {
        const isCalendarInterval =
          newInterval !== autoInterval && calendarOnlyIntervals.has(newInterval.unit);
        const value =
          newInterval === autoInterval
            ? autoInterval
            : `${isCalendarInterval ? '1' : newInterval.value}${newInterval.unit || 'd'}`;

        paramEditorUpdater((newLayer) =>
          updateColumnParam({ layer: newLayer, columnId, paramName: 'interval', value })
        );
      },
      [columnId, paramEditorUpdater]
    );

    const options = (intervalOptions || [])
      .filter((option) => option.val !== autoInterval)
      .map((option: AggParamOption) => {
        return { label: option.display, key: option.val };
      }, []);

    options.unshift({
      label: i18n.translate('xpack.lens.indexPattern.autoIntervalLabel', {
        defaultMessage: 'Auto ({interval})',
        values: {
          interval:
            data.search.aggs.calculateAutoTimeExpression({
              from: dateRange.fromDate,
              to: dateRange.toDate,
            }) || '1h',
        },
      }),
      key: autoInterval,
    });

    const definedOption = options.find((o) => o.key === intervalInput);
    const selectedOptions = definedOption
      ? [definedOption]
      : [{ label: intervalInput, key: intervalInput }];

    useEffect(() => {
      if (isValid && intervalInput !== currentColumn.params.interval) {
        setInterval(parseInterval(intervalInput));
      }
    }, [intervalInput, isValid, currentColumn.params.interval, setInterval]);

    const bindToGlobalTimePickerValue =
      indexPattern.timeFieldName === field?.name || !currentColumn.params.ignoreTimeRange;

    return (
      <>
        <EuiSpacer size="s" />
        <EuiFormRow display="rowCompressed" hasChildLabel={false}>
          <EuiSwitch
            label={
              <EuiText size="xs">
                {i18n.translate('xpack.lens.indexPattern.dateHistogram.includeEmptyRows', {
                  defaultMessage: 'Include empty rows',
                })}
              </EuiText>
            }
            checked={Boolean(currentColumn.params.includeEmptyRows)}
            data-test-subj="indexPattern-include-empty-rows"
            onChange={() => {
              paramEditorUpdater(
                updateColumnParam({
                  layer,
                  columnId,
                  paramName: 'includeEmptyRows',
                  value: !currentColumn.params.includeEmptyRows,
                })
              );
            }}
            compressed
          />
        </EuiFormRow>
        {indexPattern.timeFieldName !== field?.name && (
          <>
            <EuiSpacer size="s" />
            <EuiFormRow display="rowCompressed" hasChildLabel={false}>
              <EuiSwitch
                label={
                  <EuiText size="xs">
                    {i18n.translate(
                      'xpack.lens.indexPattern.dateHistogram.bindToGlobalTimePicker',
                      {
                        defaultMessage: 'Bind to global time picker',
                      }
                    )}{' '}
                    <EuiIconTip
                      color="subdued"
                      content={i18n.translate(
                        'xpack.lens.indexPattern.dateHistogram.globalTimePickerHelp',
                        {
                          defaultMessage:
                            "Filter the selected field by the global time picker in the top right. This setting can't be turned off for the default time field of the current data view.",
                        }
                      )}
                      iconProps={{
                        className: 'eui-alignTop',
                      }}
                      position="top"
                      size="s"
                      type="questionInCircle"
                    />
                  </EuiText>
                }
                disabled={indexPattern.timeFieldName === field?.name}
                checked={bindToGlobalTimePickerValue}
                onChange={() => {
                  let newLayer = updateColumnParam({
                    layer,
                    columnId,
                    paramName: 'ignoreTimeRange',
                    value: !currentColumn.params.ignoreTimeRange,
                  });
                  if (
                    !currentColumn.params.ignoreTimeRange &&
                    currentColumn.params.interval === autoInterval
                  ) {
                    const newFixedInterval =
                      data.search.aggs.calculateAutoTimeExpression({
                        from: dateRange.fromDate,
                        to: dateRange.toDate,
                      }) || '1h';
                    newLayer = updateColumnParam({
                      layer: newLayer,
                      columnId,
                      paramName: 'interval',
                      value: newFixedInterval,
                    });
                    setIntervalInput(newFixedInterval);
                  }
                  paramEditorUpdater(newLayer);
                }}
                compressed
              />
            </EuiFormRow>
          </>
        )}
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.dateHistogram.minimumInterval', {
            defaultMessage: 'Minimum interval',
          })}
          fullWidth
          display="rowCompressed"
          helpText={
            <>
              {i18n.translate('xpack.lens.indexPattern.dateHistogram.selectOptionHelpText', {
                defaultMessage: `Select an option or create a custom value.`,
              })}
              <br />
              {i18n.translate(
                'xpack.lens.indexPattern.dateHistogram.selectOptionExamplesHelpText',
                {
                  defaultMessage: `Examples: 30s, 20m, 24h, 2d, 1w, 1M`,
                }
              )}
            </>
          }
          isInvalid={!isValid}
          error={
            !isValid &&
            i18n.translate('xpack.lens.indexPattern.dateHistogram.invalidInterval', {
              defaultMessage:
                "Please pick a valid interval. It's not possible to use multiple weeks, months or years as interval.",
            })
          }
        >
          {intervalIsRestricted ? (
            <FormattedMessage
              id="xpack.lens.indexPattern.dateHistogram.restrictedInterval"
              defaultMessage="Interval fixed to {intervalValue} due to aggregation restrictions."
              values={{
                intervalValue: restrictedInterval(field!.aggregationRestrictions),
              }}
            />
          ) : (
            <EuiComboBox
              compressed
              fullWidth={true}
              data-test-subj="lensDateHistogramInterval"
              isInvalid={!isValid}
              onChange={(opts) => {
                const newValue = opts.length ? opts[0].key! : '';
                setIntervalInput(newValue);
                if (newValue === autoInterval && currentColumn.params.ignoreTimeRange) {
                  paramEditorUpdater(
                    updateColumnParam({
                      layer,
                      columnId,
                      paramName: 'ignoreTimeRange',
                      value: false,
                    })
                  );
                }
              }}
              onCreateOption={(customValue: string) => setIntervalInput(customValue.trim())}
              options={options}
              selectedOptions={selectedOptions}
              singleSelection={{ asPlainText: true }}
              placeholder={i18n.translate(
                'xpack.lens.indexPattern.dateHistogram.selectIntervalPlaceholder',
                {
                  defaultMessage: 'Select an interval',
                }
              )}
            />
          )}
        </EuiFormRow>
        <EuiSpacer size="s" />
        <EuiFormRow display="rowCompressed" hasChildLabel={false}>
          <TooltipWrapper
            tooltipContent={i18n.translate(
              'xpack.lens.indexPattern.dateHistogram.dropPartialBucketsHelp',
              {
                defaultMessage:
                  'Drop partial intervals is disabled as these can be computed only for a time field bound to global time picker in the top right.',
              }
            )}
            condition={!bindToGlobalTimePickerValue}
          >
            <EuiSwitch
              label={
                <EuiText size="xs">
                  {i18n.translate('xpack.lens.indexPattern.dateHistogram.dropPartialBuckets', {
                    defaultMessage: 'Drop partial intervals',
                  })}
                </EuiText>
              }
              data-test-subj="lensDropPartialIntervals"
              checked={Boolean(currentColumn.params.dropPartials)}
              onChange={onChangeDropPartialBuckets}
              compressed
              disabled={!bindToGlobalTimePickerValue}
            />
          </TooltipWrapper>
        </EuiFormRow>
      </>
    );
  },
  helpComponentTitle: i18n.translate('xpack.lens.indexPattern.dateHistogram.titleHelp', {
    defaultMessage: 'How Date histogram works',
  }),
  helpComponent() {
    const infiniteBound = i18n.translate('xpack.lens.indexPattern.dateHistogram.moreThanYear', {
      defaultMessage: 'More than a year',
    });
    const upToLabel = i18n.translate('xpack.lens.indexPattern.dateHistogram.upTo', {
      defaultMessage: 'Up to',
    });

    return (
      <>
        <p>
          {i18n.translate('xpack.lens.indexPattern.dateHistogram.autoBasicExplanation', {
            defaultMessage: 'Date histogram splits data into time intervals.',
          })}
        </p>

        <p>
          <FormattedMessage
            id="xpack.lens.indexPattern.dateHistogram.autoLongerExplanation"
            defaultMessage="To choose the interval, Lens divides the specified time range by the {targetBarSetting} Advanced Setting and calculates the best interval for your data. For example, when the time range is 4 days, the data is divided into hourly buckets. To configure the maximum number of bars, use the {maxBarSetting} Advanced Setting."
            values={{
              maxBarSetting: <EuiCode>{UI_SETTINGS.HISTOGRAM_MAX_BARS}</EuiCode>,
              targetBarSetting: <EuiCode>{UI_SETTINGS.HISTOGRAM_BAR_TARGET}</EuiCode>,
            }}
          />
        </p>

        <p>
          {i18n.translate('xpack.lens.indexPattern.dateHistogram.autoAdvancedExplanation', {
            defaultMessage: 'The interval follows this logic:',
          })}
        </p>

        <EuiBasicTable
          items={search.aggs.boundsDescendingRaw.map(({ bound, boundLabel, intervalLabel }) => ({
            bound: typeof bound === 'number' ? infiniteBound : `${upToLabel} ${boundLabel}`,
            interval: intervalLabel,
          }))}
          columns={[
            {
              field: 'bound',
              name: i18n.translate('xpack.lens.indexPattern.dateHistogram.autoBoundHeader', {
                defaultMessage: 'Target interval measured',
              }),
            },
            {
              field: 'interval',
              name: i18n.translate('xpack.lens.indexPattern.dateHistogram.autoIntervalHeader', {
                defaultMessage: 'Interval used',
              }),
            },
          ]}
        />
      </>
    );
  },
  quickFunctionDocumentation: i18n.translate(
    'xpack.lens.indexPattern.dateHistogram.documentation.quick',
    {
      defaultMessage: `
The date or date range values distributed into intervals.
      `,
    }
  ),
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

function restrictedInterval(aggregationRestrictions?: Partial<IndexPatternAggRestrictions>) {
  if (!aggregationRestrictions || !aggregationRestrictions.date_histogram) {
    return;
  }

  return (
    aggregationRestrictions.date_histogram.calendar_interval ||
    aggregationRestrictions.date_histogram.fixed_interval
  );
}
