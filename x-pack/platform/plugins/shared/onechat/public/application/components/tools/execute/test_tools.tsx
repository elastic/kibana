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
  EuiSwitch,
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
  EuiLoadingSpinner,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState } from 'react';
import { useForm, FormProvider, Controller, type Control } from 'react-hook-form';
import type { ToolDefinitionWithSchema } from '@kbn/onechat-common';
import { i18n } from '@kbn/i18n';
import { formatOnechatErrorMessage } from '@kbn/onechat-browser';
import { useExecuteTool } from '../../../hooks/tools/use_execute_tools';
import type { ExecuteToolResponse } from '../../../../../common/http_api/tools';
import { useTool } from '../../../hooks/tools/use_tools';

interface ToolTestFlyoutProps {
  isOpen: boolean;
  isLoading?: boolean;
  toolId: string;
  onClose: () => void;
}

interface ToolParameter {
  name: string;
  label: string;
  description: string;
  value: string;
  type: string;
}

enum ToolParameterType {
  TEXT = 'text',
  NUMERIC = 'numeric',
  BOOLEAN = 'boolean',
}

const getComponentType = (schemaType: string): ToolParameterType => {
  switch (schemaType) {
    case 'boolean':
      return ToolParameterType.BOOLEAN;
    case 'integer':
    case 'long':
    case 'number':
    case 'double':
    case 'float':
      return ToolParameterType.NUMERIC;
    default:
      return ToolParameterType.TEXT;
  }
};

const getParameters = (tool?: ToolDefinitionWithSchema): Array<ToolParameter> => {
  if (!tool || !tool.schema || !tool.schema.properties) return [];

  const { properties } = tool.schema;

  const fields: Array<ToolParameter> = [];

  Object.entries(properties).forEach(([paramName, paramSchema]) => {
    let type = 'string'; // default fallback

    if (paramSchema && 'type' in paramSchema && paramSchema.type) {
      if (Array.isArray(paramSchema.type)) {
        type = paramSchema.type[0];
      } else if (typeof paramSchema.type === 'string') {
        type = paramSchema.type;
      }
    }

    fields.push({
      name: paramName,
      label: paramSchema?.title || paramName,
      value: '',
      description: paramSchema?.description || '',
      type,
    });
  });

  return fields;
};

const renderFormField = (
  field: ToolParameter,
  tool: ToolDefinitionWithSchema,
  control: Control<Record<string, any>>
) => {
  const componentType = getComponentType(field.type);
  const isRequired = tool?.schema?.required?.includes(field.name);

  const commonProps = {
    name: field.name,
    control,
    rules: {
      required: isRequired ? `${field.label} is required` : false,
    },
  };

  switch (componentType) {
    case ToolParameterType.NUMERIC:
      return (
        <Controller
          {...commonProps}
          render={({ field: { onChange, value, name } }) => (
            <EuiFieldNumber
              name={name}
              value={value ?? ''}
              type="number"
              onChange={(e) => onChange(e.target.valueAsNumber || e.target.value)}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              fullWidth
            />
          )}
        />
      );

    case ToolParameterType.BOOLEAN:
      return (
        <Controller
          {...commonProps}
          defaultValue={false}
          rules={{ required: false }}
          render={({ field: { onChange, value, name } }) => (
            <EuiSwitch
              name={name}
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              label={field.label}
            />
          )}
        />
      );

    case ToolParameterType.TEXT:
    default:
      return (
        <Controller
          {...commonProps}
          render={({ field: { onChange, value, name } }) => (
            <EuiFieldText
              name={name}
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              fullWidth
            />
          )}
        />
      );
  }
};

export const ToolTestFlyout: React.FC<ToolTestFlyoutProps> = ({ toolId, onClose }) => {
  const [response, setResponse] = useState<string>('{}');

  const form = useForm<Record<string, any>>({
    mode: 'onChange',
  });

  const {
    handleSubmit,
    formState: { errors },
  } = form;

  const { tool, isLoading } = useTool({ toolId });

  const { executeTool, isLoading: isExecuting } = useExecuteTool({
    onSuccess: (data: ExecuteToolResponse) => {
      setResponse(JSON.stringify(data, null, 2));
    },
    onError: (error: Error) => {
      setResponse(JSON.stringify({ error: formatOnechatErrorMessage(error) }, null, 2));
    },
  });

  const onSubmit = async (formData: Record<string, any>) => {
    await executeTool({
      toolId: tool!.id,
      toolParams: formData,
    });
  };

  if (!tool) return null;

  return (
    <EuiFlyout onClose={onClose} aria-labelledby="flyoutTitle">
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
        {isLoading ? (
          <EuiFlexGroup justifyContent="center" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="l" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <FormProvider {...form}>
            <EuiFlexGroup gutterSize="l" responsive={false}>
              <EuiFlexItem
                grow={false}
                css={css`
                  min-width: 200px;
                  max-width: 300px;
                `}
              >
                <EuiTitle size="s">
                  <h5>
                    {i18n.translate('xpack.onechat.tools.testTool.inputsTitle', {
                      defaultMessage: 'Inputs',
                    })}
                  </h5>
                </EuiTitle>
                <EuiSpacer size="m" />
                <EuiForm component="form" onSubmit={handleSubmit(onSubmit)}>
                  {getParameters(tool).map((field) => (
                    <EuiFormRow
                      key={field.name}
                      label={field.label}
                      helpText={field.description}
                      isInvalid={!!errors[field.name]}
                      error={errors[field.name]?.message as string}
                    >
                      {renderFormField(field, tool, form.control)}
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
                  css={css`
                    height: 75vh;
                    overflow: auto;
                  `}
                >
                  {response}
                </EuiCodeBlock>
              </EuiFlexItem>
            </EuiFlexGroup>
          </FormProvider>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
