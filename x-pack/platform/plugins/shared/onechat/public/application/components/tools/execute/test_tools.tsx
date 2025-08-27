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
  EuiCodeBlock,
} from '@elastic/eui';
import React, { useState } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import type { ToolDefinition } from '@kbn/onechat-common';
import { i18n } from '@kbn/i18n';
import { useExecuteTool } from '../../../hooks/tools/use_execute_tools';
import type { ExecuteToolResponse } from '../../../../../common/http_api/tools';
import { useTool } from '../../../hooks/tools/use_tools';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';

interface OnechatTestToolFlyout {
  isOpen: boolean;
  isLoading?: boolean;
  toolId: string;
  onClose: () => void;
}

interface ToolParameter {
  name: string;
  label: string;
  value: string;
  type: string;
}

const getParameters = (tool: ToolDefinition | undefined): Array<ToolParameter> => {
  if (!tool) return [];

  const fields: Array<ToolParameter> = [];
  if (tool.configuration && tool.configuration.params) {
    const params = tool.configuration.params as Record<string, any>;
    Object.entries(params).forEach(([paramName, paramConfig]) => {
      fields.push({
        name: paramName,
        label: paramName,
        value: '',
        type: paramConfig.type || 'text',
      });
    });
  }

  return fields;
};

export const OnechatTestFlyout: React.FC<OnechatTestToolFlyout> = ({ toolId, onClose }) => {
  const [response, setResponse] = useState<string>('{}');
  const { navigateToOnechatUrl } = useNavigation();

  const { tool } = useTool({ toolId });

  const handleClose = () => {
    navigateToOnechatUrl(appPaths.tools.list);
  };

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
      toolId: tool!.id,
      toolParams,
    });
  };

  return (
    <EuiFlyout onClose={handleClose} aria-labelledby="flyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id="flyoutTitle">
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
                        name={field.name}
                        control={form.control}
                        rules={{ required: `${field.label} is required` }}
                        render={({ field: { onChange, value, name } }) => (
                          <EuiFieldNumber
                            name={name}
                            value={value || ''}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                            fullWidth
                          />
                        )}
                      />
                    ) : (
                      <Controller
                        name={field.name}
                        control={form.control}
                        rules={{ required: `${field.label} is required` }}
                        render={({ field: { onChange, value, name } }) => (
                          <EuiFieldText
                            name={name}
                            value={value || ''}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                            fullWidth
                          />
                        )}
                      />
                    )}
                  </EuiFormRow>
                ))}
                <EuiSpacer size="m" />
                <EuiButton type="submit" size="s" fill isLoading={isExecuting} disabled={!tool}>
                  {i18n.translate('xpack.onechat.tools.testTool.executeButton', {
                    defaultMessage: 'Submit',
                  })}
                </EuiButton>
              </EuiForm>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h5>
                  {i18n.translate('xpack.onechat.tools.testTool.responseTitle', {
                    defaultMessage: 'Response',
                  })}
                </h5>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiCodeBlock
                language="json"
                fontSize="s"
                paddingSize="m"
                isCopyable={true}
                style={{ height: '75vh', overflow: 'auto' }}
              >
                {response}
              </EuiCodeBlock>
            </EuiFlexItem>
          </EuiFlexGroup>
        </FormProvider>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
