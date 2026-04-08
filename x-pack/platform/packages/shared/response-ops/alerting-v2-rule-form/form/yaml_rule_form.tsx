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
}: YamlRuleFormProps) => {
  const { getValues } = useFormContext<FormValues>();
  const [yaml, setYaml] = useState<string>(() => {
    const values = getValues();
    return serializeFormToYaml(values);
  });
  const [error, setError] = useState<string | null>(null);

  const esqlCallbacks = useEsqlCallbacks({
    application: services.application,
    http: services.http,
    search: services.data.search.search,
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const result = parseYamlToFormValues(yaml);
      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.values) {
        setError(null);
        onSubmit(result.values);
      }
    },
    [yaml, onSubmit]
  );

  const handleYamlChange = useCallback((newYaml: string) => {
    setYaml(newYaml);
    // Clear error when user starts editing
    setError(null);
  }, []);

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
            value={yaml}
            onChange={handleYamlChange}
            esqlCallbacks={esqlCallbacks}
            isReadOnly={isReadOnly}
            dataTestSubj="ruleV2FormYamlEditor"
          />
        </EuiFormRow>
      </EuiForm>
    </>
  );
};
