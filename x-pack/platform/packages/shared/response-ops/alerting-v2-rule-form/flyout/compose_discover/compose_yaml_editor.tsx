/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { EuiCallOut, EuiForm, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { YamlRuleEditor } from '@kbn/yaml-rule-editor';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import { useEsqlCallbacks } from '../../form/hooks/use_esql_callbacks';
import type { ComposeFormValues } from './compose_form_types';
import { parseYamlToComposeFormValues } from './compose_mappers';

interface ComposeYamlEditorProps {
  services: RuleFormServices;
  yamlText: string;
  setYamlText: (yaml: string) => void;
  isSubmitting?: boolean;
}

/**
 * YAML editor for the compose-discover flyout.
 * Uses ComposeFormValues schema (query: RuleQuery) instead of the standalone
 * form's FormValues schema (evaluation/recoveryPolicy).
 */
export const ComposeYamlEditor: React.FC<ComposeYamlEditorProps> = ({
  services,
  yamlText,
  setYamlText,
  isSubmitting = false,
}) => {
  const [error, setError] = useState<string | null>(null);
  const { reset } = useFormContext<ComposeFormValues>();

  const esqlCallbacks = useEsqlCallbacks({
    application: services.application,
    http: services.http,
    search: services.data.search.search,
  });

  const handleBlur = useCallback(() => {
    const result = parseYamlToComposeFormValues(yamlText);
    if (result.error) {
      setError(result.error);
    } else if (result.values) {
      setError(null);
      reset(result.values);
    }
  }, [yamlText, reset]);

  const handleChange = useCallback(
    (newYaml: string) => {
      setYamlText(newYaml);
      setError(null);
    },
    [setYamlText]
  );

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

      <EuiForm>
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
            onChange={handleChange}
            onBlur={handleBlur}
            esqlCallbacks={esqlCallbacks}
            isReadOnly={isSubmitting}
            dataTestSubj="ruleV2FormYamlEditor"
          />
        </EuiFormRow>
      </EuiForm>
    </>
  );
};
