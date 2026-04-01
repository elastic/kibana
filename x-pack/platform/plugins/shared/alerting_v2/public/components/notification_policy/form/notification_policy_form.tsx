/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonGroup,
  EuiComboBox,
  type EuiComboBoxOptionOption,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import {
  DISPATCH_PER_DESCRIPTIONS,
  DISPATCH_PER_OPTIONS,
  DISPATCH_PER_LABEL,
  EPISODE_FREQUENCY_DESCRIPTIONS,
  EPISODE_FREQUENCY_OPTIONS,
  GROUP_FREQUENCY_DESCRIPTIONS,
  GROUP_FREQUENCY_OPTIONS,
  REPEAT_INTERVAL_UNIT_OPTIONS,
} from './constants';
import { MatcherInput } from './components/matcher_input';
import { optionalFieldLabelAppend } from './components/optional_label_append';
import { QuickFilters } from './components/quick_filters';
import { SuppressionBehaviorSection } from './components/suppression_behavior_section';
import { WorkflowSelector } from './components/workflow_selector';
import type {
  DispatchPer,
  NotificationPolicyFormState,
  NotificationPolicyFrequency,
} from './types';

function isEpisodeFrequency(f: NotificationPolicyFrequency): boolean {
  return (
    f.type === 'episode_status_change' ||
    f.type === 'episode_status_change_repeat' ||
    f.type === 'episode_every_evaluation'
  );
}

function isGroupFrequency(f: NotificationPolicyFrequency): boolean {
  return f.type === 'group_immediate' || f.type === 'group_throttle';
}

function createFrequencyForType(
  dispatchPer: DispatchPer,
  value: string
): NotificationPolicyFrequency {
  if (dispatchPer === 'episode') {
    switch (value) {
      case 'episode_status_change':
        return { type: 'episode_status_change' };
      case 'episode_status_change_repeat':
        return { type: 'episode_status_change_repeat', repeatValue: 5, repeatUnit: 'm' };
      case 'episode_every_evaluation':
      default:
        return { type: 'episode_every_evaluation' };
    }
  }
  switch (value) {
    case 'group_throttle':
      return { type: 'group_throttle', repeatValue: 10, repeatUnit: 'm' };
    case 'group_immediate':
    default:
      return { type: 'group_immediate' };
  }
}

export const NotificationPolicyForm = () => {
  const { control, setValue, getValues } = useFormContext<NotificationPolicyFormState>();
  const [frequency, dispatchPer, groupBy] = useWatch({
    control,
    name: ['frequency', 'dispatchPer', 'groupBy'],
  });

  const dispatchBasis = useMemo(() => {
    if (dispatchPer === 'episode') {
      return DISPATCH_PER_DESCRIPTIONS.episode;
    }
    if (groupBy.length > 0) {
      return i18n.translate(
        'xpack.alertingV2.notificationPolicy.form.dispatchConfig.groupFieldsDetail',
        {
          defaultMessage:
            'Episodes with the same values for {fields} are grouped together. One dispatch per group.',
          values: { fields: groupBy.join(', ') },
        }
      );
    }
    return i18n.translate(
      'xpack.alertingV2.notificationPolicy.form.dispatchConfig.groupByPending',
      {
        defaultMessage:
          'Group dispatch: add at least one field under Group by so episodes can be grouped.',
      }
    );
  }, [dispatchPer, groupBy]);

  const dispatchConfigCallout = useMemo(() => {
    if (!frequency) {
      return dispatchBasis;
    }
    switch (frequency.type) {
      case 'group_throttle':
        return (
          <FormattedMessage
            id="xpack.alertingV2.notificationPolicy.form.dispatchConfig.callout.groupThrottle"
            defaultMessage="{dispatchBasis} Frequency: at most once per {interval}."
            values={{
              dispatchBasis,
              interval: `${frequency.repeatValue}${frequency.repeatUnit}`,
            }}
          />
        );
      case 'episode_status_change_repeat':
        return (
          <FormattedMessage
            id="xpack.alertingV2.notificationPolicy.form.dispatchConfig.callout.episodeRepeat"
            defaultMessage="{dispatchBasis} Frequency: on status change and repeat every {interval}."
            values={{
              dispatchBasis,
              interval: `${frequency.repeatValue}${frequency.repeatUnit}`,
            }}
          />
        );
      case 'episode_status_change':
        return (
          <FormattedMessage
            id="xpack.alertingV2.notificationPolicy.form.dispatchConfig.callout.episodeStatusChange"
            defaultMessage="{dispatchBasis} Frequency: once per status transition."
            values={{ dispatchBasis }}
          />
        );
      case 'episode_every_evaluation':
        return (
          <FormattedMessage
            id="xpack.alertingV2.notificationPolicy.form.dispatchConfig.callout.episodeEveryEvaluation"
            defaultMessage="{dispatchBasis} Frequency: every evaluation cycle per episode (no throttle)."
            values={{ dispatchBasis }}
          />
        );
      case 'group_immediate':
        return (
          <FormattedMessage
            id="xpack.alertingV2.notificationPolicy.form.dispatchConfig.callout.groupImmediate"
            defaultMessage="{dispatchBasis} Frequency: every evaluation cycle per group (no throttle)."
            values={{ dispatchBasis }}
          />
        );
      default:
        return dispatchBasis;
    }
  }, [dispatchBasis, frequency]);

  return (
    <>
      {/* ── Basic information ───────────────────────────────────────────── */}
      <EuiSplitPanel.Outer borderRadius="m" hasShadow={false} hasBorder={true}>
        <EuiSplitPanel.Inner color="subdued">
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.alertingV2.notificationPolicy.form.basicInfo.title"
                defaultMessage="Basic information"
              />
            </h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.alertingV2.notificationPolicy.form.basicInfo.description"
              defaultMessage="Define the name and description for this policy"
            />
          </EuiText>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner>
          <Controller
            name="name"
            control={control}
            rules={{
              required: i18n.translate('xpack.alertingV2.notificationPolicy.form.name.required', {
                defaultMessage: 'Name is required.',
              }),
            }}
            render={({ field: { ref, ...field }, fieldState: { error } }) => (
              <EuiFormRow
                label={i18n.translate('xpack.alertingV2.notificationPolicy.form.name', {
                  defaultMessage: 'Name',
                })}
                fullWidth
                isInvalid={!!error}
                error={error?.message}
              >
                <EuiFieldText
                  {...field}
                  inputRef={ref}
                  fullWidth
                  isInvalid={!!error}
                  data-test-subj="nameInput"
                  placeholder={i18n.translate(
                    'xpack.alertingV2.notificationPolicy.form.name.placeholder',
                    { defaultMessage: 'Add policy name' }
                  )}
                />
              </EuiFormRow>
            )}
          />
          <Controller
            name="description"
            control={control}
            render={({ field: { ref, ...field } }) => (
              <EuiFormRow
                label={i18n.translate('xpack.alertingV2.notificationPolicy.form.description', {
                  defaultMessage: 'Description',
                })}
                labelAppend={optionalFieldLabelAppend}
                fullWidth
              >
                <EuiTextArea
                  {...field}
                  inputRef={ref}
                  fullWidth
                  data-test-subj="descriptionInput"
                  placeholder={i18n.translate(
                    'xpack.alertingV2.notificationPolicy.form.description.placeholder',
                    { defaultMessage: 'Add policy description' }
                  )}
                  rows={3}
                />
              </EuiFormRow>
            )}
          />
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>

      <EuiSpacer size="m" />

      {/* ── Match conditions ────────────────────────────────────────────── */}
      <EuiSplitPanel.Outer borderRadius="m" hasShadow={false} hasBorder={true}>
        <EuiSplitPanel.Inner color="subdued">
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.alertingV2.notificationPolicy.form.matchConditions.title"
                defaultMessage="Match conditions"
              />
            </h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.alertingV2.notificationPolicy.form.matchConditions.description"
              defaultMessage="Define conditions that must be met for this policy to trigger. Leave empty to match all alert episodes."
            />
          </EuiText>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner>
          <Controller
            name="matcher"
            control={control}
            render={({ field }) => (
              <>
                <EuiFormRow
                  label={
                    <EuiFormLabel>
                      {i18n.translate(
                        'xpack.alertingV2.notificationPolicy.form.quickFilters.label',
                        { defaultMessage: 'Quick filters' }
                      )}
                    </EuiFormLabel>
                  }
                  fullWidth
                >
                  <QuickFilters matcher={field.value} onChange={field.onChange} />
                </EuiFormRow>
                <EuiFormRow
                  label={i18n.translate('xpack.alertingV2.notificationPolicy.form.matcher', {
                    defaultMessage: 'Matcher',
                  })}
                  labelAppend={optionalFieldLabelAppend}
                  fullWidth
                >
                  <MatcherInput
                    value={field.value}
                    onChange={field.onChange}
                    fullWidth
                    data-test-subj="matcherInput"
                    placeholder={i18n.translate(
                      'xpack.alertingV2.notificationPolicy.form.matcher.placeholder',
                      {
                        defaultMessage:
                          'Filter episodes. e.g. episode_status:active AND rule_name: "my-rule"',
                      }
                    )}
                  />
                </EuiFormRow>
              </>
            )}
          />
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>

      <EuiSpacer size="m" />

      {/* ── Dispatch ────────────────────────────────────────────────────── */}
      <EuiSplitPanel.Outer borderRadius="m" hasShadow={false} hasBorder={true}>
        <EuiSplitPanel.Inner color="subdued">
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.alertingV2.notificationPolicy.form.dispatch.title"
                defaultMessage="Dispatch"
              />
            </h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.alertingV2.notificationPolicy.form.dispatch.description"
              defaultMessage="Dispatch sets what counts as one dispatch (per episode or per group) and how often it can be sent."
            />
          </EuiText>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner>
          <Controller
            name="dispatchPer"
            control={control}
            render={({ field }) => (
              <EuiFormRow
                label={DISPATCH_PER_LABEL}
                helpText={DISPATCH_PER_DESCRIPTIONS[field.value as DispatchPer]}
                fullWidth
              >
                <EuiButtonGroup
                  legend={DISPATCH_PER_LABEL}
                  options={DISPATCH_PER_OPTIONS}
                  idSelected={field.value}
                  onChange={(id: string) => {
                    const next = id as DispatchPer;
                    field.onChange(next);
                    const currentFreq = getValues('frequency');
                    if (next === 'episode' && isGroupFrequency(currentFreq)) {
                      setValue('frequency', { type: 'episode_every_evaluation' });
                    } else if (next === 'group' && isEpisodeFrequency(currentFreq)) {
                      setValue('frequency', { type: 'group_immediate' });
                    }
                  }}
                  data-test-subj="dispatchPerGroup"
                />
              </EuiFormRow>
            )}
          />

          {dispatchPer === 'group' && (
            <>
              <EuiSpacer size="m" />
              <Controller
                name="groupBy"
                control={control}
                rules={{
                  validate: (value: string[]) =>
                    getValues('dispatchPer') !== 'group' ||
                    value.length > 0 ||
                    i18n.translate('xpack.alertingV2.notificationPolicy.form.groupBy.required', {
                      defaultMessage: 'Add at least one field to group by.',
                    }),
                }}
                render={({ field, fieldState: { error } }) => (
                  <EuiFormRow
                    label={i18n.translate(
                      'xpack.alertingV2.notificationPolicy.form.groupBy.label',
                      {
                        defaultMessage: 'Group by',
                      }
                    )}
                    helpText={i18n.translate(
                      'xpack.alertingV2.notificationPolicy.form.groupBy.help',
                      {
                        defaultMessage:
                          'Episodes that share these field values are grouped together for dispatch.',
                      }
                    )}
                    fullWidth
                    isInvalid={!!error}
                    error={error?.message}
                  >
                    <EuiComboBox
                      fullWidth
                      noSuggestions
                      isInvalid={!!error}
                      data-test-subj="groupByInput"
                      placeholder={i18n.translate(
                        'xpack.alertingV2.notificationPolicy.form.groupBy.placeholder',
                        { defaultMessage: 'Add field…' }
                      )}
                      selectedOptions={field.value.map((v) => ({ label: v, value: v }))}
                      onChange={(options: EuiComboBoxOptionOption[]) => {
                        field.onChange(options.map((o) => String(o.label)));
                      }}
                      onCreateOption={(value: string) => {
                        const trimmed = value.trim();
                        if (!trimmed || field.value.includes(trimmed)) {
                          return;
                        }
                        field.onChange([...field.value, trimmed]);
                      }}
                    />
                  </EuiFormRow>
                )}
              />
            </>
          )}

          <EuiHorizontalRule margin="m" />

          <Controller
            name="frequency"
            control={control}
            render={({ field }) => {
              const freq = field.value;
              const freqType = freq.type;
              const isEpisode = dispatchPer === 'episode';
              const options = isEpisode ? EPISODE_FREQUENCY_OPTIONS : GROUP_FREQUENCY_OPTIONS;
              const helpText = isEpisode
                ? EPISODE_FREQUENCY_DESCRIPTIONS[freqType]
                : GROUP_FREQUENCY_DESCRIPTIONS[freqType];
              return (
                <EuiFormRow
                  label={i18n.translate('xpack.alertingV2.notificationPolicy.form.frequencyType', {
                    defaultMessage: 'Frequency',
                  })}
                  helpText={helpText ?? ''}
                  fullWidth
                >
                  <EuiSelect
                    fullWidth
                    data-test-subj="frequencySelect"
                    options={options}
                    value={freqType}
                    onChange={(e) => {
                      field.onChange(createFrequencyForType(dispatchPer, e.target.value));
                    }}
                  />
                </EuiFormRow>
              );
            }}
          />

          {(frequency?.type === 'episode_status_change_repeat' ||
            frequency?.type === 'group_throttle') && (
            <>
              <EuiSpacer size="m" />
              <EuiFormRow
                label={i18n.translate(
                  'xpack.alertingV2.notificationPolicy.form.frequency.repeatInterval.label',
                  { defaultMessage: 'Repeat interval' }
                )}
                fullWidth
              >
                <EuiFlexGroup gutterSize="s" alignItems="flexEnd" responsive={false} wrap={false}>
                  <EuiFlexItem grow={true}>
                    <Controller
                      name="frequency.repeatValue"
                      control={control}
                      rules={{
                        required: true,
                        min: {
                          value: 1,
                          message: i18n.translate(
                            'xpack.alertingV2.notificationPolicy.form.frequency.repeatValue.min',
                            { defaultMessage: 'Enter a value of at least 1.' }
                          ),
                        },
                      }}
                      render={({ field: f, fieldState: { error } }) => (
                        <EuiFieldNumber
                          fullWidth
                          min={1}
                          step={1}
                          prepend={i18n.translate(
                            'xpack.alertingV2.notificationPolicy.form.frequency.repeatInterval.everyPrefix',
                            { defaultMessage: 'Every' }
                          )}
                          placeholder={i18n.translate(
                            'xpack.alertingV2.notificationPolicy.form.frequency.repeatInterval.numberPlaceholder',
                            { defaultMessage: 'Number' }
                          )}
                          value={f.value}
                          onChange={(e) =>
                            f.onChange(e.target.value === '' ? '' : Number(e.target.value))
                          }
                          isInvalid={!!error}
                          data-test-subj="repeatIntervalValueInput"
                        />
                      )}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false} style={{ flexShrink: 0, minWidth: 120, width: 120 }}>
                    <Controller
                      name="frequency.repeatUnit"
                      control={control}
                      render={({ field: f }) => (
                        <EuiSelect
                          fullWidth
                          options={REPEAT_INTERVAL_UNIT_OPTIONS}
                          value={f.value}
                          onChange={f.onChange}
                          data-test-subj="repeatIntervalUnitSelect"
                        />
                      )}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFormRow>
              {frequency?.type === 'episode_status_change_repeat' && (
                <>
                  <EuiSpacer size="s" />
                  <EuiText
                    size="xs"
                    color="subdued"
                    data-test-subj="repeatLookbackHint"
                  >
                    {i18n.translate(
                      'xpack.alertingV2.notificationPolicy.form.frequency.repeatLookback.body',
                      {
                        defaultMessage:
                          'The dispatcher looks back 10 minutes for new events. Intervals longer than 10 minutes may cause gaps.',
                      }
                    )}
                  </EuiText>
                </>
              )}
            </>
          )}

          <EuiSpacer size="m" />

          <EuiPanel
            color="subdued"
            paddingSize="m"
            borderRadius="m"
            hasShadow={false}
            hasBorder={false}
            data-test-subj="dispatchConfigCallout"
          >
            <EuiTitle size="xxs">
              <h4>
                {i18n.translate('xpack.alertingV2.notificationPolicy.form.dispatchConfig.title', {
                  defaultMessage: 'Dispatch configuration',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">{dispatchConfigCallout}</EuiText>
          </EuiPanel>
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>

      <EuiSpacer size="m" />

      {/* ── Destinations ────────────────────────────────────────────────── */}
      <EuiSplitPanel.Outer borderRadius="m" hasShadow={false} hasBorder={true}>
        <EuiSplitPanel.Inner color="subdued">
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.alertingV2.notificationPolicy.form.destination.title"
                defaultMessage="Destinations"
              />
            </h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.alertingV2.notificationPolicy.form.destination.subtitle"
              defaultMessage="Where should dispatches be sent."
            />
          </EuiText>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner>
          <WorkflowSelector />
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>

      <EuiSpacer size="m" />

      <SuppressionBehaviorSection />
    </>
  );
};
