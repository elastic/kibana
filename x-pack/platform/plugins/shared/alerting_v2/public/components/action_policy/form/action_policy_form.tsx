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
  EuiText,
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { ClassicNotificationControlsSection } from './components/classic_notification_controls_section';
import { NotificationControlsSection } from './components/notification_controls_section';
import { PolicyScopeSection } from './components/policy_scope_section';
import { RuleTagsMatcherInput } from './components/rule_tags_matcher_input';
import { useActionPolicyPrototypeView } from './components/rule_tags_prototype_toggle';
import { WorkflowSelector } from './components/workflow_selector';
import { optionalLabel } from './form_labels';
import type { ActionPolicyFormState } from './types';

export type ActionPolicyFormVariant = 'full' | 'essential';

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

/** Compact create-from-rule form: name, rule tags (matcher), workflows. */
const EssentialActionPolicyForm = () => {
  const { control } = useFormContext<ActionPolicyFormState>();

  return (
    <>
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

      <EuiSpacer size="m" />

      <Controller
        name="matcher"
        control={control}
        render={({ field }) => (
          <RuleTagsMatcherInput matcher={field.value} onChange={field.onChange} />
        )}
      />

      <EuiSpacer size="l" />

      <EuiText size="s">
        <h3>
          <FormattedMessage
            id="xpack.alertingV2.actionPolicy.form.essential.workflowsTitle"
            defaultMessage="Workflows"
          />
        </h3>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.alertingV2.actionPolicy.form.essential.workflowsDescription"
            defaultMessage="Choose which workflows run when this policy matches."
          />
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <WorkflowSelector allowNestedFlyouts={false} allowCreateConnector={false} />
      <EuiSpacer size="xxl" />
      <EuiSpacer size="xxl" />
    </>
  );
};

const FullActionPolicyForm = () => {
  const { control } = useFormContext<ActionPolicyFormState>();
  const prototypeView = useActionPolicyPrototypeView();
  const showVisualChart = prototypeView === 'visual_chart';

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

      <PolicyScopeSection prototypeView={prototypeView} />

      <FormSectionDivider />

      {showVisualChart ? (
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
                defaultMessage="Workflows"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.alertingV2.actionPolicy.form.destination.description"
            defaultMessage="Choose which workflows run when this policy matches. Attach existing workflows or create a simple workflow here."
          />
        }
      >
        <WorkflowSelector />
      </EuiDescribedFormGroup>

      <EuiSpacer size="xxl" />
      <EuiSpacer size="xxl" />
    </EuiForm>
  );
};

export const ActionPolicyForm = ({
  variant = 'full',
}: {
  variant?: ActionPolicyFormVariant;
}) => (variant === 'essential' ? <EssentialActionPolicyForm /> : <FullActionPolicyForm />);
