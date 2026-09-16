/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { ClassicNotificationControlsSection } from './components/classic_notification_controls_section';
import { NotificationControlsSection } from './components/notification_controls_section';
import { PolicyScopeSection } from './components/policy_scope_section';
import {
  ActionPolicyPrototypeToggle,
  type ActionPolicyPrototypeView,
} from './components/rule_tags_prototype_toggle';
import { WorkflowSelector } from './components/workflow_selector';
import { optionalLabel } from './form_labels';
import type { ActionPolicyFormState } from './types';

const FormSectionDivider = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        && {
          margin-block: ${euiTheme.size.xl};
        }
      `}
    >
      <EuiHorizontalRule margin="none" />
    </div>
  );
};

export const ActionPolicyForm = () => {
  const { control } = useFormContext<ActionPolicyFormState>();
  const [prototypeView, setPrototypeView] = useState<ActionPolicyPrototypeView>('with_tags');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handlePrototypeViewChange = (view: ActionPolicyPrototypeView) => {
    setPrototypeView(view);
    if (view === 'empty') {
      setSelectedTags([]);
    }
  };

  const showEnhancedNotificationControls = prototypeView === 'notification_controls';

  return (
    <EuiForm component="div" fullWidth data-test-subj="actionPolicyForm">
      <EuiDescribedFormGroup
        fullWidth
        title={
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.alertingV2.actionPolicy.form.basicInfo.title"
                defaultMessage="Policy details"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.alertingV2.actionPolicy.form.basicInfo.description"
            defaultMessage="Name and describe this policy."
          />
        }
      >
        <Controller
          name="name"
          control={control}
          rules={{
            required: i18n.translate('xpack.alertingV2.actionPolicy.form.name.required', {
              defaultMessage: 'Name is required.',
            }),
          }}
          render={({ field: { ref, ...field }, fieldState: { error } }) => (
            <EuiFormRow
              label={i18n.translate('xpack.alertingV2.actionPolicy.form.name', {
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
                placeholder={i18n.translate('xpack.alertingV2.actionPolicy.form.name.placeholder', {
                  defaultMessage: 'Add policy name',
                })}
              />
            </EuiFormRow>
          )}
        />
        <Controller
          name="description"
          control={control}
          render={({ field: { ref, ...field } }) => (
            <EuiFormRow
              label={i18n.translate('xpack.alertingV2.actionPolicy.form.description', {
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
                  'xpack.alertingV2.actionPolicy.form.description.placeholder',
                  { defaultMessage: 'Add policy description' }
                )}
                rows={3}
              />
            </EuiFormRow>
          )}
        />
      </EuiDescribedFormGroup>

      <FormSectionDivider />

      <PolicyScopeSection
        selectedTags={selectedTags}
        onChangeTags={setSelectedTags}
        prototypeView={prototypeView}
      />

      <FormSectionDivider />

      {showEnhancedNotificationControls ? (
        <NotificationControlsSection />
      ) : (
        <ClassicNotificationControlsSection />
      )}

      <FormSectionDivider />

      <EuiDescribedFormGroup
        fullWidth
        title={
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.alertingV2.actionPolicy.form.destination.title"
                defaultMessage="Destination"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.alertingV2.actionPolicy.form.destination.description"
            defaultMessage="Select the workflows that run when dispatches are sent."
          />
        }
      >
        <WorkflowSelector />
      </EuiDescribedFormGroup>

      <EuiSpacer size="xxl" />

      <ActionPolicyPrototypeToggle
        selectedView={prototypeView}
        onChange={handlePrototypeViewChange}
      />
    </EuiForm>
  );
};
