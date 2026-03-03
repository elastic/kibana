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
import { dump, load } from 'js-yaml';
import { validateEsqlQuery } from '@kbn/alerting-v2-schemas';
import { useEsqlCallbacks } from './hooks/use_esql_callbacks';
import type { FormValues } from './types';
import { RULE_FORM_ID } from './constants';
import type { RuleFormServices } from './contexts';

/**
 * Convert FormValues to YAML-compatible object (snake_case keys for API compatibility)
 */
export const formValuesToYamlObject = (values: FormValues): Record<string, unknown> => ({
  kind: values.kind,
  metadata: {
    name: values.metadata.name,
    enabled: values.metadata.enabled,
    ...(values.metadata.description && { description: values.metadata.description }),
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

interface YamlParseResult {
  values: FormValues | null;
  error: string | null;
}

/**
 * Parse and validate YAML string to FormValues
 */
export const parseYamlToFormValues = (yamlString: string): YamlParseResult => {
  let parsed: unknown;
  try {
    parsed = load(yamlString);
  } catch (error) {
    return {
      values: null,
      error: i18n.translate('xpack.alertingV2.yamlRuleForm.yamlSyntaxError', {
        defaultMessage: 'Invalid YAML syntax.',
      }),
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      values: null,
      error: i18n.translate('xpack.alertingV2.yamlRuleForm.yamlObjectError', {
        defaultMessage: 'YAML must be an object.',
      }),
    };
  }

  const obj = parsed as Record<string, unknown>;
  const metadata = obj.metadata as Record<string, unknown> | undefined;
  const schedule = obj.schedule as Record<string, unknown> | undefined;
  const evaluation = obj.evaluation as Record<string, unknown> | undefined;
  const evalQuery = evaluation?.query as Record<string, unknown> | undefined;
  const grouping = obj.grouping as Record<string, unknown> | undefined;

  // Validate kind
  const kind = obj.kind;
  if (kind !== undefined && kind !== 'alert' && kind !== 'signal') {
    return {
      values: null,
      error: i18n.translate('xpack.alertingV2.yamlRuleForm.invalidKindError', {
        defaultMessage: 'Kind must be "alert" or "signal".',
      }),
    };
  }

  // Validate required fields
  const name = metadata?.name;
  if (typeof name !== 'string' || !name.trim()) {
    return {
      values: null,
      error: i18n.translate('xpack.alertingV2.yamlRuleForm.nameRequiredError', {
        defaultMessage: 'metadata.name is required.',
      }),
    };
  }

  const queryBase = evalQuery?.base;
  if (typeof queryBase !== 'string' || !queryBase.trim()) {
    return {
      values: null,
      error: i18n.translate('xpack.alertingV2.yamlRuleForm.queryRequiredError', {
        defaultMessage: 'evaluation.query.base is required.',
      }),
    };
  }

  // Validate ES|QL query syntax
  const queryValidationError = validateEsqlQuery(queryBase);
  if (queryValidationError) {
    return {
      values: null,
      error: queryValidationError,
    };
  }

  return {
    values: {
      kind: (kind as 'alert' | 'signal') ?? 'alert',
      metadata: {
        name: name.trim(),
        enabled: metadata?.enabled !== false,
        description: typeof metadata?.description === 'string' ? metadata.description : undefined,
        owner: typeof metadata?.owner === 'string' ? metadata.owner : undefined,
        labels: Array.isArray(metadata?.labels) ? (metadata.labels as string[]) : undefined,
      },
      timeField: typeof obj.time_field === 'string' ? obj.time_field : '@timestamp',
      schedule: {
        every: typeof schedule?.every === 'string' ? schedule.every : '5m',
        lookback: typeof schedule?.lookback === 'string' ? schedule.lookback : '1m',
      },
      evaluation: {
        query: {
          base: queryBase,
        },
      },
      grouping: Array.isArray(grouping?.fields)
        ? { fields: grouping.fields as string[] }
        : undefined,
    },
    error: null,
  };
};

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
export const YamlRuleForm: React.FC<YamlRuleFormProps> = ({
  services,
  onSubmit,
  isDisabled = false,
  isSubmitting = false,
}) => {
  const { getValues } = useFormContext<FormValues>();
  const [yaml, setYaml] = useState<string>(() => {
    const values = getValues();
    return dump(formValuesToYamlObject(values), { lineWidth: 120, noRefs: true });
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

/**
 * Serialize current form values to YAML string
 */
export const serializeFormToYaml = (values: FormValues): string => {
  return dump(formValuesToYamlObject(values), { lineWidth: 120, noRefs: true });
};
