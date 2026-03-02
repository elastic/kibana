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
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import type { NotificationPolicyFormState } from './types';
import { FREQUENCY_OPTIONS, WORKFLOW_OPTIONS } from './constants';

export const NotificationPolicyForm = () => {
  const { control } = useFormContext<NotificationPolicyFormState>();
  const frequency = useWatch({ control, name: 'frequency' });

  return (
    <>
      <EuiPanel hasBorder>
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
        <EuiSpacer size="m" />
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
          rules={{
            required: i18n.translate(
              'xpack.alertingV2.notificationPolicy.form.description.required',
              { defaultMessage: 'Description is required.' }
            ),
          }}
          render={({ field: { ref, ...field }, fieldState: { error } }) => (
            <EuiFormRow
              label={i18n.translate('xpack.alertingV2.notificationPolicy.form.description', {
                defaultMessage: 'Description',
              })}
              fullWidth
              isInvalid={!!error}
              error={error?.message}
            >
              <EuiTextArea
                {...field}
                inputRef={ref}
                fullWidth
                isInvalid={!!error}
                placeholder={i18n.translate(
                  'xpack.alertingV2.notificationPolicy.form.description.placeholder',
                  { defaultMessage: 'Add policy description' }
                )}
                rows={3}
              />
            </EuiFormRow>
          )}
        />
      </EuiPanel>

      <EuiSpacer size="m" />

      <EuiPanel hasBorder>
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
        <EuiSpacer size="m" />
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
                placeholder={i18n.translate(
                  'xpack.alertingV2.notificationPolicy.form.matcher.placeholder',
                  { defaultMessage: 'e.g. data.severity : "critical" and data.env : "prod"' }
                )}
              />
            </EuiFormRow>
          )}
        />
      </EuiPanel>

      <EuiSpacer size="m" />

      <EuiPanel hasBorder>
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
        <EuiSpacer size="m" />
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
      </EuiPanel>

      <EuiSpacer size="m" />

      <EuiPanel hasBorder>
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
        <EuiSpacer size="m" />
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
              <EuiSelect {...field} inputRef={ref} fullWidth options={FREQUENCY_OPTIONS} />
            </EuiFormRow>
          )}
        />
        {frequency.type === 'throttle' && (
          <Controller
            name="frequency.interval"
            control={control}
            rules={{
              required: i18n.translate(
                'xpack.alertingV2.notificationPolicy.form.throttleInterval.required',
                { defaultMessage: 'Throttle interval is required.' }
              ),
            }}
            render={({ field: { ref, ...field }, fieldState: { error } }) => (
              <EuiFormRow
                label={i18n.translate('xpack.alertingV2.notificationPolicy.form.throttleInterval', {
                  defaultMessage: 'Throttle interval',
                })}
                helpText={i18n.translate(
                  'xpack.alertingV2.notificationPolicy.form.throttleInterval.help',
                  { defaultMessage: 'e.g. 1h, 5m, 30s' }
                )}
                fullWidth
                isInvalid={!!error}
                error={error?.message}
              >
                <EuiFieldText {...field} inputRef={ref} fullWidth isInvalid={!!error} />
              </EuiFormRow>
            )}
          />
        )}
      </EuiPanel>

      <EuiSpacer size="m" />

      <EuiPanel hasBorder>
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.alertingV2.notificationPolicy.form.destination.title"
              defaultMessage="Destination"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <Controller
          name="workflowId"
          control={control}
          render={({ field: { ref, ...field } }) => (
            <EuiFormRow
              label={i18n.translate('xpack.alertingV2.notificationPolicy.form.workflow', {
                defaultMessage: 'Workflow',
              })}
              fullWidth
            >
              <EuiSelect {...field} inputRef={ref} fullWidth options={WORKFLOW_OPTIONS} />
            </EuiFormRow>
          )}
        />
      </EuiPanel>
    </>
  );
};
