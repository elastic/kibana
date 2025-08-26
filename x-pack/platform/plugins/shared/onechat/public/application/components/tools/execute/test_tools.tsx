/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFieldText,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import React, { useState } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import type { ToolDefinition } from '@kbn/onechat-common';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '@kbn/code-editor';
import { useExecuteTool } from '../../../hooks/tools/use_execute_tools';
import type { ExecuteToolResponse } from '../../../../../common/http_api/tools';

interface OnechatTestToolFlyoutProps {
  isOpen: boolean;
  isLoading?: boolean;
  tool?: ToolDefinition;
  onClose: () => void;
}

const getParameters = (tool: ToolDefinition | undefined) => {
  if (!tool) return [];

  const fields: Array<{ name: string; label: string; value: string; type: string }> = [];
  if (tool.configuration && tool.configuration.params) {
    const params = tool.configuration.params as Record<string, any>;
    Object.entries(params).forEach(([paramName, paramConfig]) => {
      fields.push({
        name: `${paramName}`,
        label: `${paramName}`,
        value: '',
        type: paramConfig.type || 'text',
      });
    });
  }

  return fields;
};

export const OnechatTestFlyout: React.FC<OnechatTestToolFlyoutProps> = ({
  isOpen,
  isLoading,
  tool,
  onClose,
}) => {
  const [response, setResponse] = useState<string>('{}');

  const form = useForm({
    mode: 'onChange',
  });
  const {
    handleSubmit,
    formState: { errors },
  } = form;

  const { executeTool, isLoading: isExecuting } = useExecuteTool({
    onSuccess: (data: ExecuteToolResponse) => {
      setResponse(JSON.stringify(data, null, 2));
    },
    onError: (error: Error) => {
      setResponse(JSON.stringify({ error: error.message }, null, 2));
    },
  });

  const onSubmit = async (formData: Record<string, any>) => {
    if (!tool?.id) return;

    const toolParams: Record<string, any> = {};
    getParameters(tool).forEach((field) => {
      if (field.name) {
        let value = formData[field.name];
        if (field.type === 'integer' || field.type === 'long') {
          value = parseInt(value, 10);
        } else if (field.type === 'double' || field.type === 'float') {
          value = parseFloat(value);
        }
        toolParams[field.name] = value;
      }
    });

    await executeTool({
      toolId: tool.id,
      toolParams,
    });
  };

  return (
    <EuiFlyout onClose={onClose} aria-labelledby="flyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id="testFlyoutTitle">
                {i18n.translate('xpack.onechat.tools.testFlyout.title', {
                  defaultMessage: 'Test Tool',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <FormProvider {...form}>
          <EuiFlexGroup gutterSize="l" responsive={false}>
            <EuiFlexItem grow={false} style={{ minWidth: '200px', maxWidth: '300px' }}>
              <EuiTitle size="s">
                <h5>
                  {i18n.translate('xpack.onechat.tools.testTool.inputsTitle', {
                    defaultMessage: 'Inputs',
                  })}
                </h5>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiForm component="form" onSubmit={handleSubmit(onSubmit)}>
                {getParameters(tool)?.map((field) => (
                  <EuiFormRow
                    key={field.name}
                    label={field.label}
                    isInvalid={!!errors[field.name]}
                    error={errors[field.name]?.message as string}
                  >
                    {field.type === 'integer' ||
                    field.type === 'long' ||
                    field.type === 'double' ||
                    field.type === 'float' ? (
                      <Controller
                        control={form.control}
                        name={field.name}
                        rules={{ required: `${field.label} is required` }}
                        render={({ field: { ref, ...fieldProps }, fieldState: { error } }) => (
                          <EuiFieldNumber
                            {...fieldProps}
                            inputRef={ref}
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                            fullWidth
                            isInvalid={!!error}
                          />
                        )}
                      />
                    ) : (
                      <Controller
                        control={form.control}
                        name={field.name}
                        rules={{ required: `${field.label} is required` }}
                        render={({ field: { ref, ...fieldProps }, fieldState: { error } }) => (
                          <EuiFieldText
                            {...fieldProps}
                            inputRef={ref}
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                            fullWidth
                            isInvalid={!!error}
                          />
                        )}
                      />
                    )}
                  </EuiFormRow>
                ))}
                <EuiSpacer size="m" />
                <EuiButton
                  type="submit"
                  size="s"
                  fill
                  isLoading={isExecuting}
                  disabled={Object.keys(errors).length > 0 || !tool?.id}
                >
                  {i18n.translate('xpack.onechat.tools.testTool.executeButton', {
                    defaultMessage: 'Submit',
                  })}
                </EuiButton>
              </EuiForm>
            </EuiFlexItem>
            <EuiFlexItem >
              <div style={{ marginLeft: '30px' }}>
                <EuiTitle size="s">
                  <h5>
                    {i18n.translate('xpack.onechat.tools.testTool.responseTitle', {
                      defaultMessage: 'Response',
                    })}
                  </h5>
                </EuiTitle>
              </div>
              <EuiSpacer size="m" />
              <CodeEditor
                languageId="json"
                value={response}
                fullWidth={true}
                height="calc(100vh - 200px)"
                options={{
                  readOnly: true,
                  fontSize: 14,
                  wordWrap: 'on',
                  automaticLayout: true,
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </FormProvider>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
