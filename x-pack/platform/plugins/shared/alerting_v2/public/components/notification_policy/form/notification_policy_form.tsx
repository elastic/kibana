/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiComboBox,
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { FREQUENCY_OPTIONS, THROTTLE_INTERVAL_PATTERN, WORKFLOW_OPTIONS } from './constants';
import type { NotificationPolicyDestination, NotificationPolicyFormState } from './types';

export const NotificationPolicyForm = () => {
  const { control } = useFormContext<NotificationPolicyFormState>();
  const frequency = useWatch({ control, name: 'frequency' });

  return (
    <>
      <EuiSplitPanel.Outer borderRadius="m" hasShadow={true} hasBorder={true}>
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

      <EuiSplitPanel.Outer borderRadius="m" hasShadow={true} hasBorder={true}>
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
              defaultMessage="Define conditions that must be met for this policy to trigger"
            />
          </EuiText>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner>
          <Controller
            name="matcher"
            control={control}
            render={({ field: { ref, ...field } }) => (
              <EuiFormRow
                label={i18n.translate('xpack.alertingV2.notificationPolicy.form.matcher', {
                  defaultMessage: 'Matcher',
                })}
                fullWidth
              >
                <EuiFieldText
                  {...field}
                  inputRef={ref}
                  fullWidth
                  data-test-subj="matcherInput"
                  placeholder={i18n.translate(
                    'xpack.alertingV2.notificationPolicy.form.matcher.placeholder',
                    { defaultMessage: 'e.g. data.severity : "critical" and data.env : "prod"' }
                  )}
                />
              </EuiFormRow>
            )}
          />
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>

      <EuiSpacer size="m" />

      <EuiSplitPanel.Outer borderRadius="m" hasShadow={true} hasBorder={true}>
        <EuiSplitPanel.Inner color="subdued">
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.alertingV2.notificationPolicy.form.grouping.title"
                defaultMessage="Grouping configuration"
              />
            </h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.alertingV2.notificationPolicy.form.grouping.description"
              defaultMessage="Group notifications by specific fields to reduce alert noise"
            />
          </EuiText>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner>
          <Controller
            name="groupBy"
            control={control}
            render={({ field }) => (
              <EuiFormRow
                label={i18n.translate('xpack.alertingV2.notificationPolicy.form.groupBy', {
                  defaultMessage: 'Fields',
                })}
                fullWidth
              >
                <EuiComboBox
                  fullWidth
                  data-test-subj="groupByInput"
                  placeholder={i18n.translate(
                    'xpack.alertingV2.notificationPolicy.form.groupBy.placeholder',
                    { defaultMessage: 'Add field name (ex: host.name, service)' }
                  )}
                  selectedOptions={field.value.map((g: string) => ({ label: g }))}
                  onCreateOption={(value) => {
                    field.onChange([...field.value, value]);
                  }}
                  onChange={(options) => {
                    field.onChange(options.map((o) => o.label));
                  }}
                  noSuggestions
                />
              </EuiFormRow>
            )}
          />
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>

      <EuiSpacer size="m" />

      <EuiSplitPanel.Outer borderRadius="m" hasShadow={true} hasBorder={true}>
        <EuiSplitPanel.Inner color="subdued">
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.alertingV2.notificationPolicy.form.frequency.title"
                defaultMessage="Frequency and timing configuration"
              />
            </h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.alertingV2.notificationPolicy.form.frequency.description"
              defaultMessage="Control when and how often notifications are sent"
            />
          </EuiText>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner>
          <Controller
            name="frequency.type"
            control={control}
            render={({ field: { ref, ...field } }) => (
              <EuiFormRow
                label={i18n.translate('xpack.alertingV2.notificationPolicy.form.frequencyType', {
                  defaultMessage: 'Frequency',
                })}
                fullWidth
              >
                <EuiSelect
                  {...field}
                  inputRef={ref}
                  fullWidth
                  options={FREQUENCY_OPTIONS}
                  data-test-subj="frequencySelect"
                />
              </EuiFormRow>
            )}
          />
          {frequency.type === 'throttle' && (
            <Controller
              name="frequency.interval"
              control={control}
              rules={{
                pattern: {
                  value: THROTTLE_INTERVAL_PATTERN,
                  message: i18n.translate(
                    'xpack.alertingV2.notificationPolicy.form.throttleInterval.pattern',
                    {
                      defaultMessage:
                        'Invalid throttle interval. Must be in the format of 1h, 5m, 30s',
                    }
                  ),
                },
                required: i18n.translate(
                  'xpack.alertingV2.notificationPolicy.form.throttleInterval.required',
                  { defaultMessage: 'Throttle interval is required.' }
                ),
              }}
              render={({ field: { ref, ...field }, fieldState: { error } }) => (
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.alertingV2.notificationPolicy.form.throttleInterval',
                    {
                      defaultMessage: 'Throttle interval',
                    }
                  )}
                  helpText={i18n.translate(
                    'xpack.alertingV2.notificationPolicy.form.throttleInterval.help',
                    { defaultMessage: 'e.g. 1h, 5m, 30s' }
                  )}
                  fullWidth
                  isInvalid={!!error}
                  error={error?.message}
                >
                  <EuiFieldText
                    {...field}
                    inputRef={ref}
                    value={field.value ?? ''}
                    fullWidth
                    isInvalid={!!error}
                    data-test-subj="throttleIntervalInput"
                  />
                </EuiFormRow>
              )}
            />
          )}
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>

      <EuiSpacer size="m" />

      <EuiSplitPanel.Outer borderRadius="m" hasShadow={true} hasBorder={true}>
        <EuiSplitPanel.Inner color="subdued">
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.alertingV2.notificationPolicy.form.destination.title"
                defaultMessage="Destination"
              />
            </h3>
          </EuiTitle>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner>
          <Controller
            name="destinations"
            control={control}
            rules={{
              validate: (value) =>
                value.length > 0
                  ? true
                  : i18n.translate(
                      'xpack.alertingV2.notificationPolicy.form.destination.required',
                      { defaultMessage: 'At least one destination is required' }
                    ),
            }}
            render={({ field, fieldState: { error } }) => (
              <EuiFormRow
                label={i18n.translate('xpack.alertingV2.notificationPolicy.form.destination', {
                  defaultMessage: 'Destinations',
                })}
                isInvalid={!!error}
                error={error?.message}
              >
                <EuiComboBox
                  fullWidth
                  isInvalid={!!error}
                  data-test-subj="destinationsInput"
                  placeholder={i18n.translate(
                    'xpack.alertingV2.notificationPolicy.form.destination.placeholder',
                    { defaultMessage: 'Add destination' }
                  )}
                  selectedOptions={field.value.map((d: NotificationPolicyDestination) => {
                    const workflow = WORKFLOW_OPTIONS.find((w) => w.value === d.id);
                    return {
                      label: workflow?.label ?? '',
                      value: workflow?.value ?? '',
                    };
                  })}
                  onChange={(options) => {
                    field.onChange(options.map((o) => ({ type: 'workflow', id: o.value })));
                  }}
                  options={WORKFLOW_OPTIONS}
                />
              </EuiFormRow>
            )}
          />
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </>
  );
};
