/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiCallOut, EuiForm, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { YamlRuleEditor } from '@kbn/yaml-rule-editor';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useEsqlCallbacks } from './hooks/use_esql_callbacks';
import type { FormValues } from './types';
import { RULE_FORM_ID } from './constants';
import type { RuleFormServices } from './contexts';
import {
  formValuesToYamlObject,
  parseYamlToFormValues,
  serializeFormToYaml,
} from './utils/yaml_form_utils';

// Re-export utils for backward compatibility
export { formValuesToYamlObject, parseYamlToFormValues, serializeFormToYaml };

export interface YamlRuleFormProps {
  services: RuleFormServices;
  onSubmit: (values: FormValues) => void;
  isDisabled?: boolean;
  isSubmitting?: boolean;
  /** YAML buffer, lifted to the parent so it survives Form↔YAML toggle. */
  yamlText: string;
  /** Setter for the lifted YAML buffer. */
  setYamlText: (yaml: string) => void;
}

/**
 * YAML-based rule form editor.
 *
 * Provides a YAML editor for editing rule configuration with ES|QL autocomplete.
 * Validates the YAML on submission and converts it to FormValues.
 *
 * ## YAML→Form sync — design notes
 *
 * The YAML buffer (`yamlText`) is the source of truth while the user is in YAML
 * mode. Form state must be synced from `yamlText` before the user can act on
 * form-shaped data (toggle to Form view, save the rule, etc.). There are three
 * sync points today:
 *
 *   1. **`handleBlur`** (this component) — fires when the Monaco editor loses
 *      focus. Best-effort: covers cases where focus moves to non-state-changing
 *      targets (clicking page chrome, etc.). Can race with synchronous
 *      unmounts, so it cannot be the only mechanism.
 *
 *   2. **`handleModeChange`** in `RuleFormContent` — when the user toggles to
 *      Form view, that handler explicitly flushes YAML→Form *before* changing
 *      mode. This avoids the race where setting `editMode='form'` would
 *      unmount this component and dispose the Monaco blur listener before its
 *      callback fires.
 *
 *   3. **`handleSubmit`** (this component) — Save submits the form, which
 *      runs through this component's submit handler. It re-parses `yamlText`
 *      and passes parsed values to the parent's `onSubmit` directly; doesn't
 *      depend on blur having fired.
 *
 * **If you add a new path that unmounts this component or acts on form state
 * while in YAML mode, you must flush YAML→Form at that point.** Don't rely
 * on the blur callback — Monaco's `onDidBlurEditorText` is disposed during
 * unmount and can race with synchronous state changes.
 */
export const YamlRuleForm = ({
  services,
  onSubmit,
  isDisabled = false,
  isSubmitting = false,
  yamlText,
  setYamlText,
}: YamlRuleFormProps) => {
  const [error, setError] = useState<string | null>(null);
  const { reset } = useFormContext<FormValues>();

  const esqlCallbacks = useEsqlCallbacks({
    application: services.application,
    http: services.http,
    search: services.data.search.search,
  });

  const applyYamlValuesToForm = useCallback(
    (values: FormValues) => {
      reset(values);
    },
    [reset]
  );

  // Shared parse step used by both submit and blur. Returns the parsed
  // FormValues on success, null on failure (with side-effect of setting error).
  const parseAndStoreError = useCallback((): FormValues | null => {
    const result = parseYamlToFormValues(yamlText);
    if (result.error) {
      setError(result.error);
      return null;
    }
    if (result.values) {
      setError(null);
      return result.values;
    }
    return null;
  }, [yamlText]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const values = parseAndStoreError();
      if (values) {
        onSubmit(values);
      }
    },
    [parseAndStoreError, onSubmit]
  );

  const handleBlur = useCallback(() => {
    const values = parseAndStoreError();
    if (values) {
      applyYamlValuesToForm(values);
    }
  }, [parseAndStoreError, applyYamlValuesToForm]);

  const handleYamlChange = useCallback(
    (newYaml: string) => {
      setYamlText(newYaml);
      setError(null);
    },
    [setYamlText]
  );

  const isReadOnly = isDisabled || isSubmitting;

  return (
    <>
      {error && (
        <>
          <EuiCallOut
            announceOnMount
            title={i18n.translate('xpack.alertingV2.yamlRuleForm.errorTitle', {
              defaultMessage: 'Configuration error',
            })}
            color="danger"
            iconType="error"
            data-test-subj="yamlRuleFormError"
          >
            {error}
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      <EuiForm id={RULE_FORM_ID} component="form" onSubmit={handleSubmit}>
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.alertingV2.yamlRuleForm.label"
              defaultMessage="Rule definition (YAML)"
            />
          }
          fullWidth
          helpText={
            <FormattedMessage
              id="xpack.alertingV2.yamlRuleForm.helpText"
              defaultMessage="Edit the rule as YAML. ES|QL autocomplete is available within the query field."
            />
          }
        >
          <YamlRuleEditor
            value={yamlText}
            onChange={handleYamlChange}
            onBlur={handleBlur}
            esqlCallbacks={esqlCallbacks}
            isReadOnly={isReadOnly}
            dataTestSubj="ruleV2FormYamlEditor"
          />
        </EuiFormRow>
      </EuiForm>
    </>
  );
};
