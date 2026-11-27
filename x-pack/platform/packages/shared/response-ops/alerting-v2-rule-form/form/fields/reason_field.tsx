/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { EuiFormRow, useEuiTheme } from '@elastic/eui';
import { CodeEditor, monaco } from '@kbn/code-editor';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { MAX_REASON_TEMPLATE_LENGTH } from '@kbn/alerting-v2-schemas';
import type { FormValues } from '../types';
import { useRuleFormServices } from '../contexts';
import { useQueryColumns } from '../hooks/use_query_columns';
import { getBreachQuery } from '../utils/query_helpers';
import { OPTIONAL_LABEL } from '../optional_field_label';
import { createReasonCompletionProvider } from './reason_completion_provider';
import type { ReasonTemplateVariable } from './reason_template_variables';
import { buildReasonTemplateVariables } from './reason_template_variables';

const REASON_ROW_ID = 'ruleV2FormReasonField';
const LIQUID_LANGUAGE_ID = 'liquid';
const EDITOR_HEIGHT = 84;

const EDITOR_OPTIONS = {
  lineNumbers: 'off',
  glyphMargin: false,
  folding: false,
  lineDecorationsWidth: 8,
  lineNumbersMinChars: 0,
  minimap: { enabled: false },
  wordWrap: 'on',
  scrollBeyondLastLine: false,
  overviewRulerLanes: 0,
  automaticLayout: true,
  renderLineHighlight: 'none',
  tabSize: 2,
} as const;

export const validateReasonTemplate = (value: string | undefined): string | true => {
  if (!value) return true;
  if (!value.trim()) {
    return i18n.translate('xpack.alertingV2.ruleForm.reasonBlankError', {
      defaultMessage: 'Reason cannot be blank.',
    });
  }
  if (value.length > MAX_REASON_TEMPLATE_LENGTH) {
    return i18n.translate('xpack.alertingV2.ruleForm.reasonTooLongError', {
      defaultMessage: 'Reason cannot exceed {maxLength} characters.',
      values: { maxLength: MAX_REASON_TEMPLATE_LENGTH },
    });
  }
  return true;
};

export const ReasonField = () => {
  const { control } = useFormContext<FormValues>();
  const { data } = useRuleFormServices();
  const { euiTheme } = useEuiTheme();
  const query = useWatch<FormValues, 'query'>({ name: 'query' });
  const { data: columns } = useQueryColumns({
    query: getBreachQuery(query),
    search: data.search.search,
  });

  // The completion provider is registered once per editor and reads this ref on every request, so
  // it always offers the columns of the query as it is now.
  const variablesRef = useRef<ReasonTemplateVariable[]>([]);
  variablesRef.current = buildReasonTemplateVariables(columns);

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    // `liquid` is shared by every editor of that language, so the provider is scoped to this
    // editor's model and removed with it.
    const provider = monaco.languages.registerCompletionItemProvider(
      LIQUID_LANGUAGE_ID,
      createReasonCompletionProvider({
        getVariables: () => variablesRef.current,
        getModel: () => editor.getModel(),
      })
    );
    editor.onDidDispose(() => provider.dispose());
  };

  // The editor is transparent, so the frame gives it the look of the other form controls. It must
  // not clip its content (`overflow: hidden`): the suggestion list opens below the short editor.
  const frameCss = css`
    background-color: ${euiTheme.components.forms.background};
    border: ${euiTheme.border.width.thin} solid ${euiTheme.components.forms.border};
    border-radius: ${euiTheme.border.radius.medium};
    padding-top: ${euiTheme.size.s};

    &:focus-within {
      border-color: ${euiTheme.colors.primary};
    }
  `;

  return (
    <Controller
      name="reason.template"
      control={control}
      rules={{ validate: validateReasonTemplate }}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <EuiFormRow
          id={REASON_ROW_ID}
          label={i18n.translate('xpack.alertingV2.ruleForm.reasonLabel', {
            defaultMessage: 'Reason',
          })}
          labelAppend={OPTIONAL_LABEL}
          helpText={i18n.translate('xpack.alertingV2.ruleForm.reasonHelpText', {
            defaultMessage:
              'Explains why the alert fired. Type {trigger} to insert query columns ({dataExample}) or rule fields ({ruleExample}).',
            values: {
              trigger: '{{',
              dataExample: 'data.<column>',
              ruleExample: 'rule.name',
            },
          })}
          fullWidth
          isInvalid={!!error}
          error={error?.message}
        >
          <div
            css={[
              frameCss,
              error &&
                css`
                  border-color: ${euiTheme.colors.danger};
                `,
            ]}
          >
            <CodeEditor
              languageId={LIQUID_LANGUAGE_ID}
              value={value ?? ''}
              onChange={onChange}
              onBlur={onBlur}
              editorDidMount={handleEditorDidMount}
              height={EDITOR_HEIGHT}
              width="100%"
              placeholder={i18n.translate('xpack.alertingV2.ruleForm.reasonPlaceholder', {
                defaultMessage: 'Example: CPU on {host} was {cpu}%',
                values: { host: '{{ data.host.name }}', cpu: '{{ data.cpu_pct }}' },
              })}
              options={EDITOR_OPTIONS}
              dataTestSubj="ruleReasonInput"
              aria-label={i18n.translate('xpack.alertingV2.ruleForm.reasonAriaLabel', {
                defaultMessage: 'Reason template',
              })}
            />
          </div>
        </EuiFormRow>
      )}
    />
  );
};
