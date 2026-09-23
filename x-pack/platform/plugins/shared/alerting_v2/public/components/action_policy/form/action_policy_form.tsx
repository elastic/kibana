/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldText, EuiFormRow, EuiHorizontalRule, EuiSpacer, EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useFetchRuleEventFields } from '../../../hooks/use_fetch_rule_event_fields';
import { ActionPolicyFormSection } from './components/action_policy_form_section';
import { AdvancedMatchingAccordion } from './components/advanced_matching_accordion';
import { NotificationControlsSection } from './components/notification_controls_section';
import { NotificationSummary } from './components/notification_summary';
import { optionalLabel } from './components/optional_label';
import { PolicyScopeDescription } from './components/policy_scope_description';
import { RuleTagsSelector } from './components/rule_tags_selector';
import { SimpleWorkflowBuilder } from './components/simple_workflow_builder';
import { WorkflowSelector } from './components/workflow_selector';
import type { ActionPolicyFormConfig, ActionPolicyFormState } from './types';

interface ActionPolicyFormProps {
  config?: ActionPolicyFormConfig;
}

export const ActionPolicyForm = ({ config }: ActionPolicyFormProps) => {
  const { control } = useFormContext<ActionPolicyFormState>();
  const matcher = useWatch({ control, name: 'matcher' });
  const { data: dataFieldNames } = useFetchRuleEventFields(matcher?.expression ?? undefined);
  const collapsibleSections = config?.collapsibleSections;
  const layout = config?.layout;

  return (
    <>
      <ActionPolicyFormSection
        id="policyDetails"
        layout={layout}
        title={
          <FormattedMessage
            id="xpack.alertingV2.actionPolicy.form.basicInfo.title"
            defaultMessage="Policy details"
          />
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
      </ActionPolicyFormSection>

      <EuiHorizontalRule margin="l" />

      <ActionPolicyFormSection
        id="policyScope"
        layout={layout}
        title={
          <FormattedMessage
            id="xpack.alertingV2.actionPolicy.form.matchConditions.title"
            defaultMessage="Policy scope"
          />
        }
        description={<PolicyScopeDescription matcher={matcher} />}
      >
        <Controller
          name="matcher"
          control={control}
          render={({ field }) => (
            <>
              <RuleTagsSelector matcher={field.value} onChange={field.onChange} />
              <EuiSpacer size="m" />
              <AdvancedMatchingAccordion
                matcher={field.value}
                onChange={field.onChange}
                dataFieldNames={dataFieldNames}
              />
            </>
          )}
        />
      </ActionPolicyFormSection>

      <EuiHorizontalRule margin="l" />

      <ActionPolicyFormSection
        id="notificationControls"
        config={collapsibleSections?.notificationControls}
        layout={layout}
        title={
          <FormattedMessage
            id="xpack.alertingV2.actionPolicy.form.notificationControls.title"
            defaultMessage="Notification controls"
          />
        }
        description={<NotificationSummary />}
      >
        <NotificationControlsSection />
      </ActionPolicyFormSection>

      {(!collapsibleSections?.notificationControls || !collapsibleSections.destination) && (
        <EuiHorizontalRule margin="l" />
      )}

      <ActionPolicyFormSection
        id="destination"
        config={collapsibleSections?.destination}
        layout={layout}
        title={
          <FormattedMessage
            id="xpack.alertingV2.actionPolicy.form.destination.title"
            defaultMessage="Destination"
          />
        }
        description={
          <FormattedMessage
            id="xpack.alertingV2.actionPolicy.form.destination.description"
            defaultMessage="Select the workflows that run when dispatches are sent."
          />
        }
      >
        <WorkflowSelector />
        <EuiSpacer size="m" />
        <SimpleWorkflowBuilder connectorCreationConfig={config?.connectorCreation} />
      </ActionPolicyFormSection>
    </>
  );
};
