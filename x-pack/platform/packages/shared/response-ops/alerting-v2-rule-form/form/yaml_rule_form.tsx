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

  // Wraps react-hook-form's `reset(values, options)` — its name implies
  // "throw away changes" but with values it's RHF's bulk-update API.
  // keepDirty: true so the form remains dirty after sync (Save isn't disabled).
  // keepDefaultValues: true so the original initial values stay tracked.
  const applyYamlValuesToForm = useCallback(
    (values: FormValues) => {
      reset(values, { keepDirty: true, keepDefaultValues: true });
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
    // On parse failure: error is already set; YAML buffer is preserved (lifted);
    // form state is left unchanged so the user can either fix YAML and re-blur,
    // or toggle to Form to see the last valid state.
  }, [parseAndStoreError, applyYamlValuesToForm]);

  const handleYamlChange = useCallback(
    (newYaml: string) => {
      setYamlText(newYaml);
      // Clear error when user starts editing
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
