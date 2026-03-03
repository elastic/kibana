/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';
import { validateDuration } from '@kbn/alerting-v2-schemas';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import type { FormValues } from '../types';
import { getTimeOptions } from '../../flyout/utils';

const NO_DATA_BEHAVIOR_OPTIONS = [
  {
    value: '',
    text: i18n.translate('xpack.alertingV2.ruleForm.noDataBehaviorDisabled', {
      defaultMessage: 'Not configured',
    }),
  },
  {
    value: 'no_data',
    text: i18n.translate('xpack.alertingV2.ruleForm.noDataBehaviorNoData', {
      defaultMessage: 'No data',
    }),
  },
  {
    value: 'last_status',
    text: i18n.translate('xpack.alertingV2.ruleForm.noDataBehaviorLastStatus', {
      defaultMessage: 'Last status',
    }),
  },
  {
    value: 'recover',
    text: i18n.translate('xpack.alertingV2.ruleForm.noDataBehaviorRecover', {
      defaultMessage: 'Recover',
    }),
  },
];

const NO_DATA_BEHAVIOR_ROW_ID = 'ruleV2FormNoDataBehaviorField';
const NO_DATA_TIMEFRAME_ROW_ID = 'ruleV2FormNoDataTimeframeField';
const INVALID_KEYS = ['-', '+', '.', 'e', 'E'];

type TimeUnit = 's' | 'm' | 'h';

const getNoDataTimeframeUnitOptions = (value: number): Array<{ value: TimeUnit; text: string }> =>
  getTimeOptions(value).filter((option): option is { value: TimeUnit; text: string } =>
    ['s', 'm', 'h'].includes(option.value)
  );

const getTimeframeParts = (
  timeframe: string | undefined
): { timeValue: string; timeUnit: TimeUnit } => {
  if (!timeframe) {
    return { timeValue: '', timeUnit: 'm' };
  }

  const match = timeframe.match(/^(\d+)(s|m|h)$/);
  if (!match) {
    return { timeValue: '', timeUnit: 'm' };
  }

  return {
    timeValue: match[1],
    timeUnit: match[2] as TimeUnit,
  };
};

export const NoDataHandlingField: React.FC = () => {
  const { control, setValue } = useFormContext<FormValues>();
  const kind = useWatch({ control, name: 'kind' });
  const noDataBehavior = useWatch({ control, name: 'noData.behavior' });

  if (kind !== 'alert') {
    return null;
  }

  return (
    <>
      <Controller
        name="noData.behavior"
        control={control}
        render={({ field, fieldState: { error } }) => (
          <EuiFormRow
            id={NO_DATA_BEHAVIOR_ROW_ID}
            label={i18n.translate('xpack.alertingV2.ruleForm.noDataBehaviorLabel', {
              defaultMessage: 'No-data behavior',
            })}
            helpText={i18n.translate('xpack.alertingV2.ruleForm.noDataBehaviorHelpText', {
              defaultMessage:
                'Choose how rule status changes when no results are returned for the configured timeframe.',
            })}
            isInvalid={!!error}
            error={error?.message}
          >
            <EuiSelect
              {...field}
              value={field.value ?? ''}
              onChange={(event) => {
                const nextValue = event.target.value || undefined;
                field.onChange(nextValue);

                if (!nextValue) {
                  setValue('noData.timeframe', undefined, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                } else {
                  setValue('noData.timeframe', '5m', {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }
              }}
              options={NO_DATA_BEHAVIOR_OPTIONS}
              isInvalid={!!error}
              data-test-subj="ruleNoDataBehaviorSelect"
            />
          </EuiFormRow>
        )}
      />
      {noDataBehavior ? (
        <Controller
          name="noData.timeframe"
          control={control}
          rules={{
            validate: (value) => {
              if (!value?.trim()) {
                return i18n.translate('xpack.alertingV2.ruleForm.noDataTimeframeRequired', {
                  defaultMessage:
                    'No-data timeframe is required when no-data behavior is configured.',
                });
              }

              const timeframeMatch = value.match(/^(\d+)(s|m|h)$/);
              if (!timeframeMatch) {
                return i18n.translate('xpack.alertingV2.ruleForm.noDataTimeframeFormatError', {
                  defaultMessage: 'Timeframe must use seconds, minutes, or hours.',
                });
              }

              if (parseInt(timeframeMatch[1], 10) <= 0) {
                return i18n.translate('xpack.alertingV2.ruleForm.noDataTimeframePositiveError', {
                  defaultMessage: 'Timeframe value must be a positive number.',
                });
              }

              return validateDuration(value) ?? true;
            },
          }}
          render={({ field, fieldState: { error } }) => {
            const { timeValue, timeUnit } = getTimeframeParts(field.value);
            const numericTimeValue = timeValue ? parseInt(timeValue, 10) : 1;

            const onTimeValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
              const nextValue = event.target.value.trim();
              if (!nextValue) {
                field.onChange(undefined);
                return;
              }

              if (/^[1-9][0-9]*$/.test(nextValue)) {
                field.onChange(`${nextValue}${timeUnit}`);
              }
            };

            const onTimeUnitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
              const nextUnit = event.target.value as TimeUnit;
              if (!timeValue) {
                return;
              }

              field.onChange(`${timeValue}${nextUnit}`);
            };

            const onTimeValueKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
              if (INVALID_KEYS.includes(event.key)) {
                event.preventDefault();
              }
            };

            return (
              <EuiFormRow
                id={NO_DATA_TIMEFRAME_ROW_ID}
                label={i18n.translate('xpack.alertingV2.ruleForm.noDataTimeframeLabel', {
                  defaultMessage: 'No-data timeframe',
                })}
                helpText={i18n.translate('xpack.alertingV2.ruleForm.noDataTimeframeHelpText', {
                  defaultMessage:
                    'Duration after which no data is detected. Enter a positive value and select seconds, minutes, or hours.',
                })}
                isInvalid={!!error}
                error={error?.message}
              >
                <EuiFlexGroup gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={2}>
                    <EuiFieldNumber
                      value={timeValue}
                      onChange={onTimeValueChange}
                      onKeyDown={onTimeValueKeyDown}
                      min={1}
                      step={1}
                      isInvalid={!!error}
                      aria-label={i18n.translate('xpack.alertingV2.ruleForm.noDataTimeValueLabel', {
                        defaultMessage: 'Time value',
                      })}
                      placeholder={i18n.translate(
                        'xpack.alertingV2.ruleForm.noDataTimeframeValuePlaceholder',
                        {
                          defaultMessage: '10',
                        }
                      )}
                      data-test-subj="ruleNoDataTimeframeValueInput"
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={3}>
                    <EuiSelect
                      value={timeUnit}
                      onChange={onTimeUnitChange}
                      options={getNoDataTimeframeUnitOptions(numericTimeValue)}
                      isInvalid={!!error}
                      aria-label={i18n.translate('xpack.alertingV2.ruleForm.noDataTimeUnitLabel', {
                        defaultMessage: 'Time unit',
                      })}
                      data-test-subj="ruleNoDataTimeframeUnitSelect"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFormRow>
            );
          }}
        />
      ) : null}
    </>
  );
};
