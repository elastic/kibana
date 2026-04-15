/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { FormValues } from './types';
import { SubmissionButtons } from './components/submission_buttons';
import { EditModeToggle, type EditMode } from './components/edit_mode_toggle';
import { YamlRuleForm } from './yaml_rule_form';
import {
  parseYamlToFormValuesForGuiSwitch,
  serializeFormToYaml,
} from './utils/yaml_form_utils';
import {
  RuleFormProvider,
  useRuleFormServices,
  useRuleFormMeta,
  type RuleFormServices,
  type RuleFormLayout,
  type RuleBuilderCatalogEntry,
} from './contexts';
import { GuiRuleForm } from './gui_rule_form';
import { RulePreviewPanel } from './fields/rule_preview_panel';
import { ErrorCallOut } from './error_callout';
import { useCreateRule } from './hooks/use_create_rule';
import { useUpdateRule } from './hooks/use_update_rule';

export type { RuleFormServices } from './contexts';

const mergeYamlParsedIntoFormValues = (previous: FormValues, parsed: FormValues): FormValues => ({
  ...previous,
  ...parsed,
  metadata: { ...previous.metadata, ...parsed.metadata },
  schedule: { ...previous.schedule, ...parsed.schedule },
  evaluation: { ...previous.evaluation, ...parsed.evaluation },
});

export interface RuleFormProps {
  services: RuleFormServices;
  /** Layout mode: 'page' renders the preview side-by-side; 'flyout' uses a nested flyout. Default: 'page'. */
  layout?: RuleFormLayout;
  /** Rendered in the Rule evaluation panel header (see {@link RuleFormMeta.ruleEvaluationHeaderActions}). */
  ruleEvaluationHeaderActions?: React.ReactNode;
  /**
   * Deep-linked rule builder id (for example `threshold_alert`). Passed through to {@link RuleFormMeta}.
   */
  ruleBuilderId?: string;
  /** Shown as a badge on the Rule evaluation section (builder name or ES|QL). */
  ruleEvaluationModeLabel?: string;
  /** Guided mode: builder list for the section-title super select. */
  ruleBuilderCatalog?: RuleBuilderCatalogEntry[];
  /** Guided mode: invoked when the user selects a builder from the super select. */
  onRuleBuilderIdChange?: (id: string) => void;
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
 * Inner content component that renders the GUI rule form.
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
  isSubmitting: externalIsSubmitting = false,
  includeSubmission = false,
  onCancel,
  submitLabel,
  cancelLabel,
  ruleId,
}: RuleFormProps) => {
  const services = useRuleFormServices();
  const { layout } = useRuleFormMeta();
  const { http, notifications } = services;
  const { getValues, reset } = useFormContext<FormValues>();

  const [editMode, setEditMode] = useState<EditMode>('form');
  const [yamlDraft, setYamlDraft] = useState('');

  const { createRule, isLoading: isCreating } = useCreateRule({
    http,
    notifications,
  });

  const { updateRule, isLoading: isUpdating } = useUpdateRule({
    http,
    notifications,
    ruleId: ruleId ?? '',
  });

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const internalSubmit = useCallback(
    (values: FormValues) => {
      const mutate = ruleId ? updateRule : createRule;
      mutate(values, { onSuccess: onSuccessRef.current });
    },
    [ruleId, createRule, updateRule]
  );
  const onSubmit = externalOnSubmit ?? internalSubmit;
  const isSubmitting = externalIsSubmitting || isCreating || isUpdating;

  const ruleConfigurationHeaderTitle = i18n.translate(
    'xpack.alertingV2.ruleForm.conditionSectionTitle',
    {
      defaultMessage: 'Rule configuration',
    }
  );

  const onEditModeChange = useCallback(
    (next: EditMode) => {
      if (next === 'yaml') {
        setYamlDraft(serializeFormToYaml(getValues()));
        setEditMode('yaml');
        return;
      }

      const result = parseYamlToFormValuesForGuiSwitch(getValues(), yamlDraft);
      if (result.error || !result.values) {
        notifications.toasts.addDanger({
          title: i18n.translate('xpack.alertingV2.ruleForm.editMode.invalidYamlTitle', {
            defaultMessage: 'Cannot switch to GUI view',
          }),
          text: result.error ?? undefined,
        });
        return;
      }

      reset(mergeYamlParsedIntoFormValues(getValues(), result.values));
      setEditMode('form');
    },
    [getValues, reset, yamlDraft, notifications.toasts]
  );

  const editModeToggle = (
    <>
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h3>
              <strong>{ruleConfigurationHeaderTitle}</strong>
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EditModeToggle
            editMode={editMode}
            onChange={onEditModeChange}
            disabled={isSubmitting}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </>
  );

  const mainFormFields = (
    <>
      {editModeToggle}
      <ErrorCallOut />
      {editMode === 'form' ? (
        <GuiRuleForm onSubmit={onSubmit} includeQueryEditor={includeQueryEditor} />
      ) : (
        <YamlRuleForm
          services={services}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          yaml={yamlDraft}
          onYamlChange={setYamlDraft}
        />
      )}
    </>
  );

  const submissionFooter = includeSubmission ? (
    <SubmissionButtons
      isSubmitting={isSubmitting}
      onCancel={onCancel}
      submitLabel={submitLabel}
      cancelLabel={cancelLabel}
      ruleId={ruleId}
    />
  ) : null;

  if (layout === 'page') {
    return (
      <EuiFlexGroup direction="column" gutterSize="l" alignItems="stretch">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="l" alignItems="flexStart">
            <EuiFlexItem grow={3} style={{ minWidth: 0 }}>
              {mainFormFields}
            </EuiFlexItem>
            <EuiFlexItem
              grow={2}
              style={{
                minWidth: 0,
                position: 'sticky',
                top: 24,
                alignSelf: 'flex-start',
                maxHeight: 'calc(100vh - 96px)',
                overflowY: 'auto',
              }}
              data-test-subj="ruleEvaluationPreviewRail"
            >
              <RulePreviewPanel />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {submissionFooter !== null ? (
          <EuiFlexItem grow={false} style={{ width: '100%' }}>
            {submissionFooter}
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );
  }

  return (
    <>
      {mainFormFields}
      {submissionFooter}
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
export const RuleForm = ({
  layout = 'page',
  ruleEvaluationHeaderActions,
  ruleBuilderId,
  ruleEvaluationModeLabel,
  ruleBuilderCatalog,
  onRuleBuilderIdChange,
  includeQueryEditor = true,
  ...props
}: RuleFormProps) => {
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

  const meta = useMemo(
    () => ({
      layout,
      includeQueryEditor,
      ruleEvaluationHeaderActions,
      ruleBuilderId,
      ruleEvaluationModeLabel,
      ruleBuilderCatalog,
      onRuleBuilderIdChange,
    }),
    [
      layout,
      includeQueryEditor,
      ruleEvaluationHeaderActions,
      ruleBuilderId,
      ruleEvaluationModeLabel,
      ruleBuilderCatalog,
      onRuleBuilderIdChange,
    ]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RuleFormProvider services={props.services} meta={meta}>
        <RuleFormContent {...props} layout={layout} includeQueryEditor={includeQueryEditor} />
      </RuleFormProvider>
    </QueryClientProvider>
  );
};
