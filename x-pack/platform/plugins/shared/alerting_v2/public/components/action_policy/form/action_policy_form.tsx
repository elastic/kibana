/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { DispatchSection } from './components/dispatch_section';
import { PolicyScopeSection } from './components/policy_scope_section';
import { RuleTagsMatcherInput } from './components/rule_tags_matcher_input';
import { WorkflowSelector } from './components/workflow_selector';
import type { ActionPolicyFormState } from './types';

export type ActionPolicyFormVariant = 'full' | 'essential';

const optionalLabel = (
  <EuiText color="subdued" size="xs">
    {i18n.translate('xpack.alertingV2.actionPolicy.form.optionalLabel', {
      defaultMessage: 'Optional',
    })}
  </EuiText>
);

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
      <WorkflowSelector allowNestedFlyouts={false} />
      <EuiSpacer size="xxl" />
      <EuiSpacer size="xxl" />
    </>
  );
};

const FullActionPolicyForm = () => {
  const { control } = useFormContext<ActionPolicyFormState>();

  return (
    <>
      <EuiDescribedFormGroup
        fullWidth
        title={
          <h3>
            <FormattedMessage
              id="xpack.alertingV2.actionPolicy.form.basicInfo.title"
              defaultMessage="Policy name and description"
            />
          </h3>
        }
        description={
          <FormattedMessage
            id="xpack.alertingV2.actionPolicy.form.basicInfo.description"
            defaultMessage="Define the name and description for this policy"
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

      <EuiHorizontalRule margin="l" />

      <PolicyScopeSection />

      <EuiHorizontalRule margin="l" />

      <EuiDescribedFormGroup
        fullWidth
        title={
          <h3>
            <FormattedMessage
              id="xpack.alertingV2.actionPolicy.form.dispatch.title"
              defaultMessage="Notification controls"
            />
          </h3>
        }
        description={
          <FormattedMessage
            id="xpack.alertingV2.actionPolicy.form.dispatch.description"
            defaultMessage="Controls how matching episodes are grouped and how often notifications are sent."
          />
        }
      >
        <DispatchSection />
      </EuiDescribedFormGroup>

      <EuiHorizontalRule margin="l" />

      <EuiDescribedFormGroup
        fullWidth
        title={
          <h3>
            <FormattedMessage
              id="xpack.alertingV2.actionPolicy.form.destination.title"
              defaultMessage="Workflows"
            />
          </h3>
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
    </>
  );
};

export const ActionPolicyForm = ({
  variant = 'full',
}: {
  variant?: ActionPolicyFormVariant;
}) => (variant === 'essential' ? <EssentialActionPolicyForm /> : <FullActionPolicyForm />);
