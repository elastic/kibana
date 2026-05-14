/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { FormPromptRequest, FormPromptResponse } from '@kbn/agent-builder-common/agents';
import {
  SchemaForm,
  extractSchemaDefaults,
  validateSchemaValues,
  type InboxJsonSchema,
} from '@kbn/workflows-hitl-form';
import { borderRadiusXlStyles } from '../../../../../common.styles';

const labels = {
  submit: i18n.translate('xpack.agentBuilder.formPrompt.submit', {
    defaultMessage: 'Submit',
  }),
  title: i18n.translate('xpack.agentBuilder.formPrompt.title', {
    defaultMessage: 'Input required',
  }),
};

export interface FormPromptProps {
  answeredValues?: Record<string, unknown>;
  isAnswered?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  onSubmit: (response: FormPromptResponse) => void;
  prompt: FormPromptRequest;
}

export const FormPrompt: React.FC<FormPromptProps> = ({
  answeredValues,
  isAnswered = false,
  isDisabled = false,
  isLoading = false,
  onSubmit,
  prompt,
}) => {
  const { euiTheme } = useEuiTheme();
  const schema = prompt.schema as InboxJsonSchema;
  const [values, setValues] = useState<Record<string, unknown>>(
    answeredValues ?? extractSchemaDefaults(schema)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const validationErrors = validateSchemaValues(schema, values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onSubmit({ execution_id: prompt.execution_id, id: prompt.id, values });
  };

  const containerStyles = css`
    background-color: ${euiTheme.colors.backgroundBasePlain};
    ${borderRadiusXlStyles}
    border: 1px solid ${euiTheme.colors.borderStrongPrimary};
    padding: ${euiTheme.size.base};
    ${useEuiShadow('s')};
  `;

  const headerStyles = css`
    padding-bottom: ${euiTheme.size.m};
    border-bottom: 1px solid ${euiTheme.colors.lightShade};
    margin-bottom: ${euiTheme.size.m};
  `;

  const titleStyles = css`
    font-weight: ${euiTheme.font.weight.semiBold};
    font-size: ${euiTheme.size.base};
    color: ${euiTheme.colors.textParagraph};
  `;

  const footerStyles = css`
    margin-top: ${euiTheme.size.m};
  `;

  const isFormDisabled = isDisabled || isAnswered;

  return (
    <EuiFlexGroup
      css={containerStyles}
      data-test-subj="agentBuilderFormPrompt"
      direction="column"
      gutterSize="none"
      responsive={false}
    >
      {/* Header */}
      <EuiFlexItem css={headerStyles} grow={false}>
        <span css={titleStyles}>{labels.title}</span>
      </EuiFlexItem>

      {/* Message */}
      {prompt.message && (
        <EuiFlexItem grow={false}>
          <EuiMarkdownFormat textSize="s">{prompt.message}</EuiMarkdownFormat>
        </EuiFlexItem>
      )}

      {/* Form fields */}
      <EuiFlexItem grow={false}>
        <SchemaForm
          agent_context={prompt.agent_context}
          disabled={isFormDisabled}
          errors={errors}
          onChange={setValues}
          schema={schema}
          values={values}
        />
      </EuiFlexItem>

      {/* Submit button */}
      <EuiFlexItem css={footerStyles} grow={false}>
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="agentBuilderFormPromptSubmitButton"
              disabled={isFormDisabled || isLoading}
              fill
              isLoading={isLoading}
              onClick={handleSubmit}
              size="s"
            >
              {labels.submit}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
