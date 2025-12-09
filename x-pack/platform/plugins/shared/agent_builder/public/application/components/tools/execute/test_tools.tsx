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
import { formatOnechatErrorMessage } from '@kbn/onechat-browser';
import type { ToolDefinitionWithSchema } from '@kbn/onechat-common';
import React, { useState } from 'react';
import { Controller, FormProvider, useForm, type Control } from 'react-hook-form';
import { docLinks } from '../../../../../common/doc_links';
import type { ExecuteToolResponse } from '../../../../../common/http_api/tools';
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
    i18n.translate('xpack.onechat.tools.testTool.fieldRequiredError', {
      defaultMessage: '{label} is required',
      values: { label },
    }),
  inputPlaceholder: (label: string) =>
    i18n.translate('xpack.onechat.tools.testTool.inputPlaceholder', {
      defaultMessage: 'Enter {label}',
      values: { label },
    }),
  title: i18n.translate('xpack.onechat.tools.testFlyout.title', {
    defaultMessage: 'Test Tool',
  }),
  inputsTitle: i18n.translate('xpack.onechat.tools.testTool.inputsTitle', {
    defaultMessage: 'Inputs',
  }),
  executeButton: i18n.translate('xpack.onechat.tools.testTool.executeButton', {
    defaultMessage: 'Submit',
  }),
  responseTitle: i18n.translate('xpack.onechat.tools.testTool.responseTitle', {
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
              value={value as string}
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
  const [response, setResponse] = useState<string>('{}');
  // Re-mount new responses, needed for virtualized EuiCodeBlock
  // https://github.com/elastic/eui/issues/9034
  const [responseKey, setResponseKey] = useState<number>(0);

  const form = useForm<Record<string, any>>({
    mode: 'onChange',
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
      setResponse(JSON.stringify({ error: formatOnechatErrorMessage(error) }, null, 2));
    },
    onSettled: () => {
      setResponseKey((key) => key + 1);
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
    <EuiFlyout onClose={onClose} aria-labelledby="flyoutTitle" css={flyoutStyles}>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id="flyoutTitle">{i18nMessages.title}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiLink href={`${docLinks.tools}#testing-your-tools`} target="_blank">
              {i18n.translate('xpack.onechat.tools.testFlyout.documentationLink', {
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
