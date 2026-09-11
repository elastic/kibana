/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonGroup,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
} from '@elastic/eui';
import type { GroupingMode, ThrottleStrategy } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useFetchRuleEventFields } from '../../../../hooks/use_fetch_rule_event_fields';
import {
  AGGREGATE_STRATEGY_OPTIONS,
  DEFAULT_STRATEGY_FOR_MODE,
  DEFAULT_THROTTLE_INTERVAL,
  GROUPING_MODE_OPTIONS,
  PER_EPISODE_STRATEGY_OPTIONS,
  THROTTLE_INTERVAL_PATTERN,
} from '../constants';
import { needsInterval } from '../form_utils';
import type { ActionPolicyFormState } from '../types';
import { DurationInput } from './duration_input/duration_input';
import { FrequencyHelpPopover } from './frequency_help_popover';

export const DispatchSection = () => {
  const { control, setValue, getValues } = useFormContext<ActionPolicyFormState>();
  const [groupingMode, throttleStrategy, matcher] = useWatch({
    control,
    name: ['groupingMode', 'throttleStrategy', 'matcher'],
  });
  const { data: dataFieldNames } = useFetchRuleEventFields(matcher);

  useEffect(() => {
    if (needsInterval(getValues('throttleStrategy')) && !getValues('throttleInterval')) {
      setValue('throttleInterval', DEFAULT_THROTTLE_INTERVAL);
    }
  }, [getValues, setValue]);

  const groupByOptions = useMemo(
    () => (dataFieldNames ?? []).map((name) => ({ label: name })),
    [dataFieldNames]
  );

  const showInterval = needsInterval(throttleStrategy);

  const strategyOptions =
    groupingMode === 'per_episode' ? PER_EPISODE_STRATEGY_OPTIONS : AGGREGATE_STRATEGY_OPTIONS;

  const frequencyLabel = (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        {i18n.translate('xpack.alertingV2.actionPolicy.form.dispatch.frequency', {
          defaultMessage: 'Frequency',
        })}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <FrequencyHelpPopover groupingMode={groupingMode} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <>
      <Controller
        name="groupingMode"
        control={control}
        render={({ field }) => (
          <EuiFormRow
            label={i18n.translate('xpack.alertingV2.actionPolicy.form.dispatch.dispatchPer', {
              defaultMessage: 'Notify per',
            })}
            fullWidth
          >
            <EuiButtonGroup
              legend={i18n.translate('xpack.alertingV2.actionPolicy.form.dispatch.modeLegend', {
                defaultMessage: 'Notify per',
              })}
              options={GROUPING_MODE_OPTIONS}
              idSelected={field.value}
              onChange={(id) => {
                const mode = id as GroupingMode;
                field.onChange(mode);
                setValue('throttleStrategy', DEFAULT_STRATEGY_FOR_MODE[mode]);
                setValue(
                  'throttleInterval',
                  needsInterval(DEFAULT_STRATEGY_FOR_MODE[mode]) ? DEFAULT_THROTTLE_INTERVAL : ''
                );
              }}
              isFullWidth
              type="single"
              data-test-subj="groupingModeToggle"
            />
          </EuiFormRow>
        )}
      />

      {groupingMode === 'per_field' && (
        <Controller
          name="groupBy"
          control={control}
          rules={{
            validate: (val) => {
              if (!val || val.length === 0) {
                return i18n.translate('xpack.alertingV2.actionPolicy.form.groupBy.required', {
                  defaultMessage: 'At least one group-by field is required.',
                });
              }
              return true;
            },
          }}
          render={({ field, fieldState: { error } }) => (
            <EuiFormRow
              label={i18n.translate('xpack.alertingV2.actionPolicy.form.groupBy', {
                defaultMessage: 'Group by',
              })}
              fullWidth
              isInvalid={!!error}
              error={error?.message}
              helpText={i18n.translate('xpack.alertingV2.actionPolicy.form.groupBy.helpText', {
                defaultMessage:
                  'Episodes that share these field values are grouped into a single notification.',
              })}
            >
              <EuiComboBox
                isInvalid={!!error}
                fullWidth
                data-test-subj="groupByInput"
                placeholder={i18n.translate(
                  'xpack.alertingV2.actionPolicy.form.groupBy.placeholder',
                  { defaultMessage: 'Add field...' }
                )}
                selectedOptions={field.value.map((g: string) => ({ label: g }))}
                options={groupByOptions}
                onCreateOption={(val) => {
                  field.onChange([...field.value, val]);
                }}
                onChange={(options) => {
                  field.onChange(options.map((o) => o.label));
                }}
              />
            </EuiFormRow>
          )}
        />
      )}

      <Controller
        name="throttleStrategy"
        control={control}
        render={({ field: { ref, ...field } }) => (
          <EuiFormRow label={frequencyLabel} fullWidth>
            <EuiSelect
              {...field}
              inputRef={ref}
              fullWidth
              options={strategyOptions}
              onChange={(e) => {
                field.onChange(e);
                const strategy = e.target.value as ThrottleStrategy;
                if (needsInterval(strategy) && !getValues('throttleInterval')) {
                  setValue('throttleInterval', DEFAULT_THROTTLE_INTERVAL);
                }
              }}
              data-test-subj="strategySelect"
            />
          </EuiFormRow>
        )}
      />

      {showInterval && (
        <Controller
          name="throttleInterval"
          control={control}
          rules={{
            validate: (val) => {
              if (!val || !THROTTLE_INTERVAL_PATTERN.test(val)) {
                return i18n.translate(
                  'xpack.alertingV2.actionPolicy.form.throttleInterval.required',
                  { defaultMessage: 'Repeat interval is required.' }
                );
              }
              return true;
            },
          }}
          render={({ field, fieldState: { error } }) => (
            <EuiFormRow
              label={i18n.translate('xpack.alertingV2.actionPolicy.form.dispatch.repeatInterval', {
                defaultMessage: 'Repeat interval',
              })}
              fullWidth
              isInvalid={!!error}
              error={error?.message}
            >
              <DurationInput
                value={field.value}
                onChange={field.onChange}
                isInvalid={!!error}
                data-test-subj="throttleIntervalInput"
              />
            </EuiFormRow>
          )}
        />
      )}
    </>
  );
};
