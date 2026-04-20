/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useFetchDataFields } from '../../../hooks/use_fetch_data_fields';
import { DispatchSection } from './components/dispatch_section';
import { MatcherInput } from './components/matcher_input';
import { TagsInput } from './components/tags_input';
import { WorkflowSelector } from './components/workflow_selector';
import type { NotificationPolicyFormState } from './types';

const optionalLabel = (
  <EuiText color="subdued" size="xs">
    {i18n.translate('xpack.alertingV2.notificationPolicy.form.optionalLabel', {
      defaultMessage: 'Optional',
    })}
  </EuiText>
);

export const NotificationPolicyForm = () => {
  const { control } = useFormContext<NotificationPolicyFormState>();
  const { data: dataFieldNames } = useFetchDataFields();

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
                labelAppend={optionalLabel}
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
          <Controller
            name="tags"
            control={control}
            render={({ field }) => (
              <EuiFormRow
                label={i18n.translate('xpack.alertingV2.notificationPolicy.form.tags', {
                  defaultMessage: 'Tags',
                })}
                labelAppend={optionalLabel}
                fullWidth
              >
                <TagsInput value={field.value} onChange={field.onChange} />
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
              defaultMessage="Define conditions that must be met for this policy to trigger. Leave empty to match all alert episodes."
            />
          </EuiText>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner>
          <Controller
            name="matcher"
            control={control}
            render={({ field }) => (
              <EuiFormRow
                label={i18n.translate('xpack.alertingV2.notificationPolicy.form.matcher', {
                  defaultMessage: 'Matcher',
                })}
                labelAppend={optionalLabel}
                fullWidth
              >
                <MatcherInput
                  value={field.value}
                  onChange={field.onChange}
                  fullWidth
                  data-test-subj="matcherInput"
                  dataFieldNames={dataFieldNames}
                  placeholder={i18n.translate(
                    'xpack.alertingV2.notificationPolicy.form.matcher.placeholder',
                    { defaultMessage: 'e.g. data.host.name : "my-host.com" and rule.id : "uuid"' }
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
                id="xpack.alertingV2.notificationPolicy.form.dispatch.title"
                defaultMessage="Dispatch"
              />
            </h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.alertingV2.notificationPolicy.form.dispatch.description"
              defaultMessage="How should matched episodes be grouped, and how often should they be dispatched?"
            />
          </EuiText>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner>
          <DispatchSection />
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
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.alertingV2.notificationPolicy.form.destination.description"
              defaultMessage="Select the workflows that should be triggered when dispatches are sent."
            />
          </EuiText>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner>
          <WorkflowSelector />
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </>
  );
};
