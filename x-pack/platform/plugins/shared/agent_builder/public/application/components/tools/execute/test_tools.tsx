/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import type { ToolDefinitionWithSchema } from '@kbn/agent-builder-common';
import React, { useState } from 'react';
import { Controller, FormProvider, useForm, type Control } from 'react-hook-form';
import type { ExecuteToolResponse } from '../../../../../common/http_api/tools';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useExecuteTool } from '../../../hooks/tools/use_execute_tools';
import { useTool } from '../../../hooks/tools/use_tools';
import { ToolFormMode } from '../form/tool_form';
import { labels } from '../../../utils/i18n';

const flyoutStyles = css`
  .euiFlyoutBody__overflowContent {
    height: 100%;
  }
`;

const flyoutContentStyles = css`
  height: 100%;
`;

const inputsColumnStyles = css`
  overflow-y: auto;
`;

const submitButtonContainerStyles = css`
  align-self: flex-end;
`;

const i18nMessages = {
  fieldRequiredError: (label: string) =>
    i18n.translate('xpack.agentBuilder.tools.testTool.fieldRequiredError', {
      defaultMessage: '{label} is required',
      values: { label },
    }),
  inputPlaceholder: (label: string) =>
    i18n.translate('xpack.agentBuilder.tools.testTool.inputPlaceholder', {
      defaultMessage: 'Enter {label}',
      values: { label },
    }),
  title: i18n.translate('xpack.agentBuilder.tools.testFlyout.title', {
    defaultMessage: 'Test Tool',
  }),
  inputsTitle: i18n.translate('xpack.agentBuilder.tools.testTool.inputsTitle', {
    defaultMessage: 'Inputs',
  }),
  executeButton: i18n.translate('xpack.agentBuilder.tools.testTool.executeButton', {
    defaultMessage: 'Submit',
  }),
  responseTitle: i18n.translate('xpack.agentBuilder.tools.testTool.responseTitle', {
    defaultMessage: 'Response',
  }),
};

interface ToolParameter {
  name: string;
  label: string;
  description: string;
  value: string;
  type: string;
  optional: boolean;
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
  if (!tool?.schema?.properties) return [];

  const { properties, required } = tool.schema;
  const requiredParams = new Set(required);

  return Object.entries(properties).map(([paramName, paramSchema]) => {
    let type = 'string'; // default fallback

    if (paramSchema && 'type' in paramSchema && paramSchema.type) {
      if (Array.isArray(paramSchema.type)) {
        type = paramSchema.type[0];
      } else if (typeof paramSchema.type === 'string') {
        type = paramSchema.type;
      }
    }

    return {
      name: paramName,
      label: paramSchema?.title || paramName,
      value: '',
      description: paramSchema?.description || '',
      type,
      optional: !requiredParams.has(paramName),
    };
  });
};

/**
 * Transforms form data to convert array string inputs to arrays
 * The form UI only has text inputs, so array fields come through as strings (JSON or comma-separated)
 */
const transformFormDataToSchemaTypes = (
  formData: Record<string, any>,
  tool?: ToolDefinitionWithSchema
): Record<string, any> => {
  if (!tool?.schema?.properties) return formData;

  const transformed: Record<string, any> = {};

  // Iterate over all schema properties to handle missing keys and apply defaults
  for (const [key, paramSchema] of Object.entries(tool.schema.properties)) {
    const value = formData[key];

    // Check if value is missing/empty and schema has a default - apply default
    const hasDefault = 'default' in paramSchema && paramSchema.default !== undefined;
    const isEmpty = value == null || value === '' || !(key in formData);

    if (isEmpty && hasDefault) {
      transformed[key] = paramSchema.default;
      continue;
    }

    // If value is missing and no default, skip (will be handled by Zod schema validation)
    if (!(key in formData) && !hasDefault) {
      continue;
    }

    let schemaType: string | string[] | undefined;
    if (paramSchema && 'type' in paramSchema) {
      schemaType = paramSchema.type as string | string[] | undefined;
    }

    // Only transform arrays and objects - numbers and booleans are handled by form components
    if (schemaType === 'array' || (Array.isArray(schemaType) && schemaType.includes('array'))) {
      if (value == null || value === '') {
        // Null, undefined, or empty string for array becomes empty array
        transformed[key] = [];
      } else if (Array.isArray(value)) {
        transformed[key] = value;
      } else if (typeof value === 'string') {
        // Try to parse as JSON array first
        try {
          const parsed = JSON.parse(value);
          transformed[key] = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          // If not valid JSON, split by comma or wrap single value
          const trimmed = value.trim();
          if (trimmed.includes(',')) {
            transformed[key] = trimmed
              .split(',')
              .map((v) => v.trim())
              .filter((v) => v.length > 0);
          } else {
            transformed[key] = [trimmed];
          }
        }
      } else {
        transformed[key] = value;
      }
    } else if (
      schemaType === 'object' ||
      (Array.isArray(schemaType) && schemaType.includes('object'))
    ) {
      // Handle object types - parse JSON strings
      if (typeof value === 'string' && value.trim() !== '') {
        try {
          transformed[key] = JSON.parse(value);
        } catch {
          // If not valid JSON, keep as string (will fail validation, but that's expected)
          transformed[key] = value;
        }
      } else if (value === '' || value == null) {
        // Empty string or null for object should be undefined (optional) or empty object
        transformed[key] = undefined;
      } else {
        transformed[key] = value;
      }
    } else {
      // Pass through other types as-is (form components handle numbers/booleans)
      transformed[key] = value;
    }
  }

  return transformed;
};

const renderFormField = ({
  parameter,
  control,
}: {
  parameter: ToolParameter;
  control: Control<ToolDefinitionWithSchema['configuration']>;
}) => {
  const { label, name, optional, type } = parameter;
  const componentType = getComponentType(type);

  const commonProps = {
    name,
    control,
    rules: {
      required: !optional ? i18nMessages.fieldRequiredError(parameter.label) : false,
    },
  };

  switch (componentType) {
    case ToolParameterType.NUMERIC:
      return (
        <Controller
          {...commonProps}
          render={({ field: { onChange, value, ref, ...field } }) => (
            <EuiFieldNumber
              {...field}
              inputRef={ref}
              value={(value as number) ?? ''}
              type="number"
              onChange={(e) => onChange(e.target.valueAsNumber || e.target.value)}
              placeholder={i18nMessages.inputPlaceholder(label)}
              fullWidth
            />
          )}
        />
      );

    case ToolParameterType.BOOLEAN:
      return (
        <Controller
          {...commonProps}
          rules={{ required: false }}
          render={({ field: { onChange, value, ref, ...field } }) => (
            <EuiSwitch
              {...field}
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              label={label}
            />
          )}
        />
      );

    case ToolParameterType.TEXT:
    default:
      return (
        <Controller
          {...commonProps}
          render={({ field: { value, ref, ...field } }) => (
            <EuiFieldText
              {...field}
              inputRef={ref}
              value={(value as string) ?? ''}
              placeholder={i18nMessages.inputPlaceholder(label)}
              fullWidth
            />
          )}
        />
      );
  }
};

export interface ToolTestFlyoutProps {
  toolId: string;
  onClose: () => void;
  formMode?: ToolFormMode;
}

export const ToolTestFlyout: React.FC<ToolTestFlyoutProps> = ({ toolId, onClose, formMode }) => {
  const isSmallScreen = useIsWithinBreakpoints(['xs', 's', 'm']);
  const { docLinksService } = useAgentBuilderServices();
  const [response, setResponse] = useState<string>('{}');
  // Re-mount new responses, needed for virtualized EuiCodeBlock
  // https://github.com/elastic/eui/issues/9034
  const [responseKey, setResponseKey] = useState<number>(0);

  const form = useForm<Record<string, any>>({
    mode: 'onChange',
    defaultValues: {},
  });

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = form;
  const hasErrors = Object.keys(errors).length > 0;

  const { tool, isLoading } = useTool({ toolId });

  const { executeTool, isLoading: isExecuting } = useExecuteTool({
    onSuccess: (data: ExecuteToolResponse) => {
      setResponse(JSON.stringify(data, null, 2));
    },
    onError: (error: Error) => {
      setResponse(JSON.stringify({ error: formatAgentBuilderErrorMessage(error) }, null, 2));
    },
    onSettled: () => {
      setResponseKey((key) => key + 1);
    },
  });

  const onSubmit = async (formData: Record<string, any>) => {
    // Transform form data to match schema types (strings -> arrays, numbers, booleans)
    const transformedParams = transformFormDataToSchemaTypes(formData, tool);

    await executeTool({
      toolId: tool!.id,
      toolParams: transformedParams,
    });
  };

  if (!tool) return null;

  return (
    <EuiFlyout onClose={onClose} aria-labelledby="flyoutTitle" css={flyoutStyles}>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id="flyoutTitle">{i18nMessages.title}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiLink href={`${docLinksService.tools}#testing-your-tools`} target="_blank">
              {i18n.translate('xpack.agentBuilder.tools.testFlyout.documentationLink', {
                defaultMessage: 'Documentation - Testing tools',
              })}
            </EuiLink>
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
            <EuiFlexGroup
              gutterSize={isSmallScreen ? 'm' : 'l'}
              direction={isSmallScreen ? 'column' : 'row'}
              css={flyoutContentStyles}
            >
              <EuiFlexItem css={inputsColumnStyles}>
                <EuiTitle size="s">
                  <h5>{i18nMessages.inputsTitle}</h5>
                </EuiTitle>
                <EuiSpacer size="m" />
                <EuiForm component="form" onSubmit={handleSubmit(onSubmit)}>
                  <EuiFlexGroup direction="column" gutterSize="none">
                    {getParameters(tool).map((parameter) => {
                      const { name, label, description, optional } = parameter;
                      return (
                        <EuiFormRow
                          key={name}
                          label={label}
                          labelAppend={
                            optional && (
                              <EuiText size="xs" color="subdued">
                                {labels.common.optional}
                              </EuiText>
                            )
                          }
                          helpText={description}
                          isInvalid={!!errors[name]}
                          error={errors[name]?.message as string}
                          fullWidth
                        >
                          {renderFormField({
                            parameter,
                            control,
                          })}
                        </EuiFormRow>
                      );
                    })}
                    <EuiSpacer size="m" />
                    <EuiFlexItem css={!isSmallScreen && submitButtonContainerStyles}>
                      <EuiButton
                        type="submit"
                        iconType="sortRight"
                        isLoading={isExecuting}
                        disabled={!tool || hasErrors}
                        data-test-subj="agentBuilderToolTestSubmitButton"
                      >
                        {i18nMessages.executeButton}
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiForm>
              </EuiFlexItem>
              <EuiFlexItem grow={2}>
                <EuiTitle size="s">
                  <h5>{i18nMessages.responseTitle}</h5>
                </EuiTitle>
                <EuiSpacer size="m" />
                <EuiCodeBlock
                  key={responseKey}
                  language="json"
                  fontSize="s"
                  paddingSize="m"
                  isCopyable={true}
                  lineNumbers
                  isVirtualized
                  overflowHeight="100%"
                  data-test-subj="agentBuilderToolTestResponse"
                >
                  {response}
                </EuiCodeBlock>
              </EuiFlexItem>
            </EuiFlexGroup>
          </FormProvider>
        )}
      </EuiFlyoutBody>
      {formMode === ToolFormMode.Edit && (
        <EuiFlyoutFooter>
          <EuiButtonEmpty
            aria-label={labels.tools.testTool.backToEditToolButton}
            iconType="sortLeft"
            onClick={onClose}
          >
            {labels.tools.testTool.backToEditToolButton}
          </EuiButtonEmpty>
        </EuiFlyoutFooter>
      )}
    </EuiFlyout>
  );
};
