/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonGroup,
  EuiButtonIcon,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { GroupingMode, ThrottleStrategy } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useFetchRuleEventFields } from '../../../../hooks/use_fetch_rule_event_fields';
import {
  AGGREGATE_STRATEGY_HELP_TEXT,
  AGGREGATE_STRATEGY_OPTIONS,
  DEFAULT_STRATEGY_FOR_MODE,
  DEFAULT_THROTTLE_INTERVAL,
  GROUPING_MODE_UI_OPTIONS,
  PER_EPISODE_STRATEGY_HELP_TEXT,
  PER_EPISODE_STRATEGY_OPTIONS,
  THROTTLE_INTERVAL_PATTERN,
  groupingModeToUiOption,
  uiOptionToGroupingMode,
  type GroupingModeUiOption,
} from '../constants';
import { needsInterval } from '../form_utils';
import type { ActionPolicyFormState } from '../types';
import { DurationInput } from './duration_input/duration_input';

const SEND_DATA_LABEL = i18n.translate(
  'xpack.alertingV2.actionPolicy.form.dispatch.dispatchPer',
  {
    defaultMessage: 'How should alert data be sent?',
  }
);

const GROUP_BY_FIELD_SWITCH_LABEL = i18n.translate(
  'xpack.alertingV2.actionPolicy.form.dispatch.groupByFieldSwitch',
  {
    defaultMessage: 'Group alerts that share a field value',
  }
);

const FREQUENCY_LABEL = i18n.translate(
  'xpack.alertingV2.actionPolicy.form.dispatch.frequency',
  {
    defaultMessage: 'Frequency',
  }
);

const FREQUENCY_HELP_ARIA = i18n.translate(
  'xpack.alertingV2.actionPolicy.form.dispatch.frequency.helpAriaLabel',
  {
    defaultMessage: 'Frequency options explained',
  }
);

const FrequencyOptionsHelp = ({
  options,
  helpByStrategy,
}: {
  options: Array<{ value: ThrottleStrategy; text: string }>;
  helpByStrategy: Partial<Record<ThrottleStrategy, string>>;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef<number | undefined>();

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== undefined) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }
  };

  const open = () => {
    clearCloseTimer();
    setIsOpen(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  useEffect(() => () => clearCloseTimer(), []);

  const items = options
    .map((option) => {
      const help = helpByStrategy[option.value];
      if (!help) {
        return null;
      }
      return { value: option.value, text: option.text, help };
    })
    .filter((item): item is { value: ThrottleStrategy; text: string; help: string } =>
      Boolean(item)
    );

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="upCenter"
      panelPaddingSize="m"
      ownFocus={false}
      button={
        <EuiButtonIcon
          iconType="info"
          color="text"
          size="xs"
          aria-label={FREQUENCY_HELP_ARIA}
          onMouseEnter={open}
          onMouseLeave={scheduleClose}
          onFocus={open}
          onBlur={scheduleClose}
          data-test-subj="frequencyOptionsHelpButton"
        />
      }
    >
      <div
        onMouseEnter={open}
        onMouseLeave={scheduleClose}
        data-test-subj="frequencyOptionsHelpPanel"
        style={{ maxWidth: 360 }}
      >
        <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
          {items.map((item) => (
            <EuiFlexItem key={item.value} grow={false}>
              <EuiText size="s">
                <strong>{item.text}</strong>
              </EuiText>
              <EuiText size="xs" color="subdued">
                <p>{item.help}</p>
              </EuiText>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};

export const DispatchSection = () => {
  const { euiTheme } = useEuiTheme();
  const { control, setValue, getValues } = useFormContext<ActionPolicyFormState>();
  const [groupingMode, throttleStrategy, matcher] = useWatch({
    control,
    name: ['groupingMode', 'throttleStrategy', 'matcher'],
  });
  const { data: dataFieldNames } = useFetchRuleEventFields(matcher?.expression ?? undefined);

  useEffect(() => {
    if (needsInterval(getValues('throttleStrategy')) && !getValues('throttleInterval')) {
      setValue('throttleInterval', DEFAULT_THROTTLE_INTERVAL);
    }
  }, [getValues, setValue]);

  const groupByOptions = useMemo(
    () => (dataFieldNames ?? []).map((name) => ({ label: name })),
    [dataFieldNames]
  );

  const selectedUiOption = groupingModeToUiOption(groupingMode);
  const isBundleMode = selectedUiOption === 'bundle';
  const showInterval = needsInterval(throttleStrategy);

  const strategyOptions =
    groupingMode === 'per_episode' ? PER_EPISODE_STRATEGY_OPTIONS : AGGREGATE_STRATEGY_OPTIONS;
  const strategyHelpText =
    groupingMode === 'per_episode' ? PER_EPISODE_STRATEGY_HELP_TEXT : AGGREGATE_STRATEGY_HELP_TEXT;

  const applyGroupingMode = (mode: GroupingMode) => {
    setValue('groupingMode', mode);
    setValue('throttleStrategy', DEFAULT_STRATEGY_FOR_MODE[mode]);
    setValue(
      'throttleInterval',
      needsInterval(DEFAULT_STRATEGY_FOR_MODE[mode]) ? DEFAULT_THROTTLE_INTERVAL : ''
    );
  };

  const optionsPanelCss = css`
    margin-top: ${euiTheme.size.s};
    padding: ${euiTheme.size.m};
    border: 1px solid ${euiTheme.colors.borderBaseSubdued};
    border-radius: ${euiTheme.border.radius.medium};
  `;

  const howOftenControls = (
    <>
      <Controller
        name="throttleStrategy"
        control={control}
        render={({ field: { ref, ...field } }) => (
          <EuiFormRow
            label={
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>{FREQUENCY_LABEL}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <FrequencyOptionsHelp
                    options={strategyOptions}
                    helpByStrategy={strategyHelpText}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            fullWidth
          >
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

  return (
    <>
      <EuiTitle size="xxs">
        <h4>{SEND_DATA_LABEL}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <Controller
        name="groupingMode"
        control={control}
        render={({ field }) => (
          <EuiButtonGroup
            legend={SEND_DATA_LABEL}
            options={GROUPING_MODE_UI_OPTIONS}
            idSelected={selectedUiOption}
            onChange={(id) => {
              const mode = uiOptionToGroupingMode(id as GroupingModeUiOption);
              field.onChange(mode);
              setValue('throttleStrategy', DEFAULT_STRATEGY_FOR_MODE[mode]);
              setValue(
                'throttleInterval',
                needsInterval(DEFAULT_STRATEGY_FOR_MODE[mode]) ? DEFAULT_THROTTLE_INTERVAL : ''
              );
            }}
            buttonSize="compressed"
            isFullWidth
            type="single"
            data-test-subj="groupingModeToggle"
          />
        )}
      />

      {isBundleMode ? (
        <div data-test-subj="combinedOptions" css={optionsPanelCss}>
          <EuiSwitch
            label={GROUP_BY_FIELD_SWITCH_LABEL}
            checked={groupingMode === 'per_field'}
            onChange={(event) => {
              applyGroupingMode(event.target.checked ? 'per_field' : 'all');
            }}
            data-test-subj="groupByFieldSwitch"
          />

          {groupingMode === 'per_field' && (
            <>
              <EuiSpacer size="m" />
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
                    label={i18n.translate('xpack.alertingV2.actionPolicy.form.groupBy.fields', {
                      defaultMessage: 'Fields',
                    })}
                    fullWidth
                    isInvalid={!!error}
                    error={error?.message}
                  >
                    <EuiComboBox
                      isInvalid={!!error}
                      fullWidth
                      data-test-subj="groupByInput"
                      placeholder={i18n.translate(
                        'xpack.alertingV2.actionPolicy.form.groupBy.placeholder',
                        { defaultMessage: 'Search fields...' }
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
            </>
          )}

          <EuiSpacer size="m" />
          {howOftenControls}
        </div>
      ) : (
        <div data-test-subj="perAlertOptions" css={optionsPanelCss}>
          {howOftenControls}
        </div>
      )}
    </>
  );
};
