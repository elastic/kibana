/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FormValues } from './types';
import { EditModeToggle, type EditMode } from './components/edit_mode_toggle';
import { RuleFormServicesProvider, useRuleFormServices, type RuleFormServices } from './contexts';
import { YamlRuleForm } from './yaml_rule_form';
import { GuiRuleForm } from './gui_rule_form';
import { useCreateRule } from './hooks/use_create_rule';
import { RULE_FORM_ID } from './constants';

export interface RuleFormProps {
  services: RuleFormServices;
  /**
   * External submit handler. When provided, form submission delegates to this callback.
   * When omitted and `includeSubmission` is true, the form uses `useCreateRule` internally.
   */
  onSubmit?: (values: FormValues) => void;
  /** Callback invoked after a successful internal submission (useCreateRule). */
  onSuccess?: () => void;
  onCancel?: () => void;
  /** Whether to include the ES|QL query editor (default: true) */
  includeQueryEditor?: boolean;
  /** Whether to include YAML editor toggle (default: false) */
  includeYaml?: boolean;
  isDisabled?: boolean;
  /** Whether the form is currently submitting (controls button loading state) */
  isSubmitting?: boolean;
  /** Whether to show submit/cancel buttons (default: false) */
  includeSubmission?: boolean;
  submitLabel?: React.ReactNode;
  cancelLabel?: React.ReactNode;
}

interface SubmissionButtonsProps {
  isSubmitting: boolean;
  onCancel?: () => void;
  submitLabel?: React.ReactNode;
  cancelLabel?: React.ReactNode;
}

const SubmissionButtons: React.FC<SubmissionButtonsProps> = ({
  isSubmitting,
  onCancel,
  submitLabel,
  cancelLabel,
}) => {
  const defaultSubmitLabel = (
    <FormattedMessage id="xpack.alertingV2.ruleForm.submitLabel" defaultMessage="Save" />
  );

  const defaultCancelLabel = (
    <FormattedMessage id="xpack.alertingV2.ruleForm.cancelLabel" defaultMessage="Cancel" />
  );

  return (
    <>
      <EuiSpacer size="l" />
      <EuiFlexGroup justifyContent="flexStart" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiButton
            type="submit"
            form={RULE_FORM_ID}
            isLoading={isSubmitting}
            fill
            data-test-subj="ruleV2FormSubmitButton"
          >
            {submitLabel ?? defaultSubmitLabel}
          </EuiButton>
        </EuiFlexItem>
        {onCancel && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onCancel}
              isDisabled={isSubmitting}
              data-test-subj="ruleV2FormCancelButton"
            >
              {cancelLabel ?? defaultCancelLabel}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};

/**
 * Inner content component that renders the appropriate form based on edit mode.
 *
 * When an external `onSubmit` is provided, form submission delegates to it.
 * Otherwise, the component uses `useCreateRule` internally to persist the rule
 * via the API and calls `onSuccess` after a successful save.
 */
const RuleFormContent: React.FC<RuleFormProps> = ({
  onSubmit: externalOnSubmit,
  onSuccess,
  includeQueryEditor = true,
  includeYaml = false,
  isDisabled = false,
  isSubmitting: externalIsSubmitting = false,
  includeSubmission = false,
  onCancel,
  submitLabel,
  cancelLabel,
}) => {
  const { reset } = useFormContext<FormValues>();
  const services = useRuleFormServices();
  const { http, notifications } = services;
  const [editMode, setEditMode] = useState<EditMode>('form');

  // Internal submission via useCreateRule — always initialised so hooks are stable,
  // but only used when no external onSubmit is provided.
  const { createRule, isLoading: isCreating } = useCreateRule({
    http,
    notifications,
    onSuccess,
  });

  // Resolve the effective submit handler: external callback takes precedence,
  // otherwise fall back to the internal createRule mutation.
  const onSubmit = externalOnSubmit ?? createRule;
  const isSubmitting = externalIsSubmitting || isCreating;

  const handleModeChange = useCallback(
    (newMode: EditMode) => {
      if (newMode === editMode) return;
      setEditMode(newMode);
    },
    [editMode]
  );

  // Wrapper that syncs YAML changes back to form state before submitting
  const handleYamlSubmit = useCallback(
    (values: FormValues) => {
      reset(values);
      onSubmit(values);
    },
    [reset, onSubmit]
  );

  const isYamlMode = editMode === 'yaml';

  return (
    <>
      {includeYaml && (
        <>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EditModeToggle
                editMode={editMode}
                onChange={handleModeChange}
                disabled={isDisabled || isSubmitting}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </>
      )}

      {isYamlMode && includeYaml ? (
        <YamlRuleForm
          services={services}
          onSubmit={handleYamlSubmit}
          isDisabled={isDisabled}
          isSubmitting={isSubmitting}
        />
      ) : (
        <GuiRuleForm onSubmit={onSubmit} includeQueryEditor={includeQueryEditor} />
      )}

      {includeSubmission && (
        <SubmissionButtons
          isSubmitting={isSubmitting}
          onCancel={onCancel}
          submitLabel={submitLabel}
          cancelLabel={cancelLabel}
        />
      )}
    </>
  );
};

/**
 * Stateless rule form component.
 *
 * This component renders form fields and expects a FormProvider context to exist.
 * It does not manage form state - that responsibility belongs to the parent component
 * (DynamicRuleForm or StandaloneRuleForm).
 *
 * When `onSubmit` is provided, form submission is delegated to that callback.
 * When `onSubmit` is omitted, the form uses `useCreateRule` internally and
 * calls `onSuccess` after a successful API save.
 *
 * Includes its own QueryClientProvider for react-query hooks used by field components.
 * Services are provided via RuleFormServicesProvider context, eliminating prop drilling.
 */
export const RuleForm: React.FC<RuleFormProps> = (props) => {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
          },
        },
      }),
    []
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RuleFormServicesProvider services={props.services}>
        <RuleFormContent {...props} />
      </RuleFormServicesProvider>
    </QueryClientProvider>
  );
};
