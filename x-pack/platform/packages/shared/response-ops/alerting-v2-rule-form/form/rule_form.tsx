/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { FormValues } from './types';
import { EditModeToggle, type EditMode } from './components/edit_mode_toggle';
import { SubmissionButtons } from './components/submission_buttons';
import {
  RuleFormProvider,
  useRuleFormServices,
  useRuleFormMeta,
  type RuleFormServices,
  type RuleFormLayout,
} from './contexts';
import { YamlRuleForm } from './yaml_rule_form';
import { GuiRuleForm } from './gui_rule_form';
import { RulePreviewPanel } from './fields/rule_preview_panel';
import { NameField } from './fields/name_field';
import { ErrorCallOut } from './error_callout';
import { useCreateRule } from './hooks/use_create_rule';
import { useUpdateRule } from './hooks/use_update_rule';

export type { RuleFormServices } from './contexts';

export interface RuleFormProps {
  services: RuleFormServices;
  /** Layout mode: 'page' renders the preview side-by-side; 'flyout' uses a nested flyout. Default: 'page'. */
  layout?: RuleFormLayout;
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
  /** When provided, the form operates in edit mode and uses PATCH instead of POST on submission. */
  ruleId?: string;
}

/**
 * Inner content component that renders the appropriate form based on edit mode.
 *
 * When an external `onSubmit` is provided, form submission delegates to it.
 * Otherwise, the component uses `useCreateRule` or `useUpdateRule` internally
 * (depending on whether `ruleId` is present) to persist the rule via the API
 * and calls `onSuccess` after a successful save.
 */
const RuleFormContent = ({
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
  ruleId,
}: RuleFormProps) => {
  const { reset } = useFormContext<FormValues>();
  const services = useRuleFormServices();
  const { layout } = useRuleFormMeta();
  const { http, notifications } = services;
  const [editMode, setEditMode] = useState<EditMode>('form');

  // Internal submission hooks — always initialised so hooks are stable,
  // but only the appropriate one is used when no external onSubmit is provided.
  const { createRule, isLoading: isCreating } = useCreateRule({
    http,
    notifications,
  });

  const { updateRule, isLoading: isUpdating } = useUpdateRule({
    http,
    notifications,
    ruleId: ruleId ?? '',
  });

  // Keep a stable ref so the internalSubmit callback doesn't re-create on every render
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  // Resolve the effective submit handler: external callback takes precedence,
  // otherwise use updateRule for edits (ruleId present) or createRule for new rules.
  const internalSubmit = useCallback(
    (values: FormValues) => {
      const mutate = ruleId ? updateRule : createRule;
      mutate(values, { onSuccess: onSuccessRef.current });
    },
    [ruleId, createRule, updateRule]
  );
  const onSubmit = externalOnSubmit ?? internalSubmit;
  const isSubmitting = externalIsSubmitting || isCreating || isUpdating;

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

  const formContent = (
    <>
      <ErrorCallOut />
      {isYamlMode ? (
        includeYaml && (
          <EditModeToggle
            editMode={editMode}
            onChange={handleModeChange}
            disabled={isDisabled || isSubmitting}
          />
        )
      ) : (
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem>
            <NameField />
          </EuiFlexItem>
          {includeYaml && (
            <EuiFlexItem grow={false}>
              <EditModeToggle
                editMode={editMode}
                onChange={handleModeChange}
                disabled={isDisabled || isSubmitting}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      )}
      <EuiSpacer size="m" />

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
          ruleId={ruleId}
        />
      )}
    </>
  );

  if (layout === 'page') {
    return (
      <EuiFlexGroup gutterSize="l" alignItems="flexStart">
        <EuiFlexItem grow={1} style={{ minWidth: 0 }}>
          {formContent}
        </EuiFlexItem>
        <EuiFlexItem grow={1} style={{ minWidth: 0 }}>
          <RulePreviewPanel />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // Flyout layout: form with nested flyout preview
  return (
    <>
      {formContent}
      <RulePreviewPanel />
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
 * Services and layout metadata are provided via RuleFormProvider context, eliminating prop drilling.
 */
export const RuleForm = ({ layout = 'page', ...props }: RuleFormProps) => {
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

  const meta = useMemo(() => ({ layout }), [layout]);

  return (
    <QueryClientProvider client={queryClient}>
      <RuleFormProvider services={props.services} meta={meta}>
        <RuleFormContent {...props} />
      </RuleFormProvider>
    </QueryClientProvider>
  );
};
