/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { ApplicationStart, HttpStart, NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { YamlRuleEditor } from '@kbn/yaml-rule-editor';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { dump, load } from 'js-yaml';
import { useEsqlCallbacks } from './hooks/use_esql_callbacks';
import type { FormValues } from './types';
import { RuleExecutionFieldGroup } from './field_groups/rule_execution_field_group';
import { RuleDetailsFieldGroup } from './field_groups/rule_details_field_group';
import { QueryFieldGroup } from './field_groups/query_field_group';
import { ErrorCallOut } from '../flyout/error_callout';
import { EditModeToggle, type EditMode } from './components/edit_mode_toggle';
import { useCreateRule } from './hooks/use_create_rule';

/** Form ID constant - only one rule form should exist at a time */
export const RULE_FORM_ID = 'ruleV2Form';

export interface RuleFormServices {
  http: HttpStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  application: ApplicationStart;
  /** Required when includeSubmission is true */
  notifications?: NotificationsStart;
}

export interface RuleFormProps {
  services: RuleFormServices;
  /**
   * Called with form values when form is submitted.
   * Only used when includeSubmission is false - when true, the form handles submission internally.
   */
  onSubmit?: (values: FormValues) => void;
  /** Whether to include the ES|QL query editor (default: true) */
  includeQueryEditor?: boolean;
  /** Whether to include YAML editor toggle (default: false). Requires services.application. */
  includeYaml?: boolean;
  /** Whether the form is in a loading/disabled state */
  isDisabled?: boolean;
  /**
   * Whether to include submit/cancel buttons (default: false).
   * When true, the form handles the API call internally using useCreateRule.
   * Requires services.notifications to be provided.
   */
  includeSubmission?: boolean;
  /** Called after successful rule creation (only used when includeSubmission is true) */
  onSuccess?: () => void;
  /** Callback when cancel button is clicked */
  onCancel?: () => void;
  /** Custom label for the submit button */
  submitLabel?: React.ReactNode;
  /** Custom label for the cancel button */
  cancelLabel?: React.ReactNode;
}

/**
 * Convert FormValues to YAML-compatible object (snake_case)
 */
const formValuesToYamlObject = (values: FormValues): Record<string, unknown> => ({
  kind: values.kind,
  metadata: {
    name: values.metadata.name,
    ...(values.metadata.owner && { owner: values.metadata.owner }),
    ...(values.metadata.labels?.length && { labels: values.metadata.labels }),
  },
  time_field: values.timeField,
  schedule: {
    every: values.schedule.every,
    lookback: values.schedule.lookback,
  },
  evaluation: {
    query: {
      base: values.evaluation.query.base,
    },
  },
  ...(values.grouping?.fields?.length && { grouping: { fields: values.grouping.fields } }),
});

/**
 * Parse YAML string to FormValues (returns null if invalid)
 */
const yamlToFormValues = (yamlString: string): FormValues | null => {
  try {
    const parsed = load(yamlString);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    const obj = parsed as Record<string, unknown>;
    const metadata = obj.metadata as Record<string, unknown> | undefined;
    const schedule = obj.schedule as Record<string, unknown> | undefined;
    const evaluation = obj.evaluation as Record<string, unknown> | undefined;
    const evalQuery = evaluation?.query as Record<string, unknown> | undefined;
    const grouping = obj.grouping as Record<string, unknown> | undefined;

    return {
      kind: (obj.kind as 'alert' | 'signal') ?? 'alert',
      metadata: {
        name: (metadata?.name as string) ?? '',
        enabled: true,
        owner: metadata?.owner as string | undefined,
        labels: metadata?.labels as string[] | undefined,
      },
      timeField: (obj.time_field as string) ?? '@timestamp',
      schedule: {
        every: (schedule?.every as string) ?? '1m',
        lookback: (schedule?.lookback as string) ?? '5m',
      },
      evaluation: {
        query: {
          base: (evalQuery?.base as string) ?? '',
        },
      },
      grouping: grouping?.fields ? { fields: grouping.fields as string[] } : undefined,
    };
  } catch {
    return null;
  }
};

interface RuleFormContentProps extends Omit<RuleFormProps, 'includeSubmission' | 'onSuccess'> {
  /** The actual submit handler - either from consumer or from useCreateRule */
  onFormSubmit: (values: FormValues) => void;
  /** Loading state for submission */
  isSubmitting?: boolean;
  /** Whether to show submission buttons */
  showSubmissionButtons?: boolean;
}

/**
 * Inner content component that renders form fields and handles mode switching.
 */
const RuleFormContent: React.FC<RuleFormContentProps> = ({
  services,
  onFormSubmit,
  includeQueryEditor = true,
  includeYaml = false,
  isDisabled = false,
  isSubmitting = false,
  showSubmissionButtons = false,
  onCancel,
  submitLabel,
  cancelLabel,
}) => {
  const esqlCallbacks = useEsqlCallbacks({
    application: services.application,
    http: services.http,
    search: services.data.search.search,
  });
  const { handleSubmit, getValues, reset } = useFormContext<FormValues>();
  const [editMode, setEditMode] = useState<EditMode>('form');
  const [yaml, setYaml] = useState<string>('');
  const [yamlError, setYamlError] = useState<string | null>(null);

  const handleModeChange = useCallback(
    (newMode: EditMode) => {
      if (newMode === editMode) return;

      if (newMode === 'yaml') {
        const values = getValues();
        const yamlObj = formValuesToYamlObject(values);
        setYaml(dump(yamlObj, { lineWidth: 120, noRefs: true }));
        setYamlError(null);
      } else {
        const parsed = yamlToFormValues(yaml);
        if (parsed) {
          reset(parsed);
          setYamlError(null);
        } else {
          setYamlError('Cannot switch to Form mode: YAML contains invalid configuration.');
          return;
        }
      }

      setEditMode(newMode);
    },
    [editMode, getValues, reset, yaml]
  );

  const handleYamlSubmit = useCallback(() => {
    const parsed = yamlToFormValues(yaml);
    if (parsed) {
      onFormSubmit(parsed);
    } else {
      setYamlError('Invalid YAML configuration.');
    }
  }, [yaml, onFormSubmit]);

  const isYamlMode = editMode === 'yaml';

  const defaultSubmitLabel = (
    <FormattedMessage id="xpack.alertingV2.ruleForm.submitLabel" defaultMessage="Save" />
  );

  const defaultCancelLabel = (
    <FormattedMessage id="xpack.alertingV2.ruleForm.cancelLabel" defaultMessage="Cancel" />
  );

  const renderSubmissionButtons = () => {
    if (!showSubmissionButtons) return null;

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

      {yamlError && (
        <>
          <EuiCallOut
            announceOnMount
            title={i18n.translate('xpack.alertingV2.ruleForm.yamlErrorTitle', {
              defaultMessage: 'Configuration error',
            })}
            color="danger"
            iconType="error"
          >
            {yamlError}
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      {isYamlMode && includeYaml ? (
        <>
          <EuiForm
            id={RULE_FORM_ID}
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              handleYamlSubmit();
            }}
          >
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.alertingV2.ruleForm.yamlLabel"
                  defaultMessage="Rule definition (YAML)"
                />
              }
              fullWidth
              helpText={
                <FormattedMessage
                  id="xpack.alertingV2.ruleForm.yamlHelpText"
                  defaultMessage="Edit the rule as YAML. ES|QL autocomplete is available within the query field."
                />
              }
            >
              <YamlRuleEditor
                value={yaml}
                onChange={setYaml}
                esqlCallbacks={esqlCallbacks!}
                isReadOnly={isDisabled || isSubmitting}
                dataTestSubj="ruleV2FormYamlEditor"
              />
            </EuiFormRow>
          </EuiForm>
          {renderSubmissionButtons()}
        </>
      ) : (
        <>
          <EuiForm id={RULE_FORM_ID} component="form" onSubmit={handleSubmit(onFormSubmit)}>
            <ErrorCallOut />
            {includeQueryEditor && (
              <>
                <QueryFieldGroup />
                <EuiSpacer size="m" />
              </>
            )}
            <RuleDetailsFieldGroup />
            <EuiSpacer size="m" />
            <RuleExecutionFieldGroup services={services} />
          </EuiForm>
          {renderSubmissionButtons()}
        </>
      )}
    </>
  );
};

/**
 * Wrapper that provides internal submission handling via useCreateRule.
 * Only rendered when includeSubmission is true.
 */
const RuleFormWithSubmission: React.FC<
  Omit<RuleFormProps, 'onSubmit'> & { notifications: NotificationsStart }
> = ({ services, onSuccess, notifications, ...props }) => {
  const { createRule, isLoading } = useCreateRule({
    http: services.http,
    notifications,
    onSuccess,
  });

  return (
    <RuleFormContent
      {...props}
      services={services}
      onFormSubmit={createRule}
      isSubmitting={isLoading}
      showSubmissionButtons
    />
  );
};

/**
 * Inner rule form component that routes to the appropriate implementation.
 */
const RuleFormInner: React.FC<RuleFormProps> = (props) => {
  const { includeSubmission, onSubmit, onSuccess, services, ...rest } = props;

  if (includeSubmission && services.notifications) {
    return (
      <RuleFormWithSubmission
        {...rest}
        services={services}
        notifications={services.notifications}
        onSuccess={onSuccess}
      />
    );
  }

  // Standard mode - consumer handles submission
  return (
    <RuleFormContent
      {...rest}
      services={services}
      onFormSubmit={onSubmit ?? (() => {})}
      showSubmissionButtons={false}
    />
  );
};

/**
 * Stateless rule form component.
 *
 * This component renders form fields and expects a FormProvider context to exist.
 * It does not manage form state - that responsibility belongs to the parent component
 * (DynamicRuleForm or StandaloneRuleForm).
 *
 * When includeSubmission is true, the form handles the API call internally.
 * When includeSubmission is false, it calls onSubmit with form values.
 *
 * Includes its own QueryClientProvider for react-query hooks used by field components.
 */
export const RuleForm: React.FC<RuleFormProps> = (props) => {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <RuleFormInner {...props} />
    </QueryClientProvider>
  );
};
