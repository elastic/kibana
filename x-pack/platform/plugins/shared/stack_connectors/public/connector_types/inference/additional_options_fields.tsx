/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { css } from '@emotion/react';

import {
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
  EuiAccordion,
  EuiFieldText,
  useEuiTheme,
  EuiTextColor,
  EuiButtonGroup,
  EuiPanel,
  EuiHorizontalRule,
  EuiButtonEmpty,
  EuiCopy,
  EuiButton,
  useEuiFontSize,
} from '@elastic/eui';
import {
  getFieldValidityAndErrorMessage,
  UseField,
  useFormContext,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { FormattedMessage } from '@kbn/i18n-react';

import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { ConfigEntryView } from '../../../common/dynamic_config/types';
import { ConnectorConfigurationFormItems } from '../lib/dynamic_config/connector_configuration_form_items';
import * as i18n from './translations';
import { DEFAULT_TASK_TYPE } from './constants';
import { Config } from './types';
import { TaskTypeOption } from './helpers';

// Custom trigger button CSS
const buttonCss = css`
  &:hover {
    text-decoration: none;
  }
`;

interface AdditionalOptionsConnectorFieldsProps {
  config: Config;
  readOnly: boolean;
  isEdit: boolean;
  optionalProviderFormFields: ConfigEntryView[];
  onSetProviderConfigEntry: (key: string, value: unknown) => Promise<void>;
  onTaskTypeOptionsSelect: (taskType: string, provider?: string) => void;
  selectedTaskType?: string;
  taskTypeFormFields: ConfigEntryView[];
  taskTypeSchema: ConfigEntryView[];
  taskTypeOptions: TaskTypeOption[];
}

export const AdditionalOptionsConnectorFields: React.FC<AdditionalOptionsConnectorFieldsProps> = ({
  config,
  readOnly,
  isEdit,
  taskTypeOptions,
  optionalProviderFormFields,
  taskTypeFormFields,
  taskTypeSchema,
  selectedTaskType,
  onSetProviderConfigEntry,
  onTaskTypeOptionsSelect,
}) => {
  const xsFontSize = useEuiFontSize('xs').fontSize;
  const { euiTheme } = useEuiTheme();
  const { setFieldValue, validateFields } = useFormContext();

  const onSetTaskTypeConfigEntry = useCallback(
    async (key: string, value: unknown) => {
      if (taskTypeSchema) {
        const entry: ConfigEntryView | undefined = taskTypeSchema.find(
          (p: ConfigEntryView) => p.key === key
        );
        if (entry) {
          if (!config.taskTypeConfig) {
            config.taskTypeConfig = {};
          }
          const newConfig = { ...config.taskTypeConfig };
          newConfig[key] = value;
          setFieldValue('config.taskTypeConfig', newConfig);
          await validateFields(['config.taskTypeConfig']);
        }
      }
    },
    [config, setFieldValue, taskTypeSchema, validateFields]
  );

  const taskTypeSettings = useMemo(
    () =>
      selectedTaskType || config.taskType?.length ? (
        <>
          <EuiTitle size="xxs" data-test-subj="task-type-details-label">
            <h4>
              <FormattedMessage
                id="xpack.stackConnectors.components.inference.taskTypeDetailsLabel"
                defaultMessage="Task settings"
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <div
            css={css`
              font-size: ${xsFontSize};
              color: ${euiTheme.colors.textSubdued};
            `}
          >
            <FormattedMessage
              id="xpack.stackConnectors.components.inference.taskTypeHelpLabel"
              defaultMessage="Configure the inference task. These settings are specific to the service and model selected."
            />
          </div>
          <EuiSpacer size="m" />
          <UseField
            path="config.taskType"
            config={{
              validations: [
                {
                  validator: fieldValidators.emptyField(i18n.getRequiredMessage('Task type')),
                  isBlocking: true,
                },
              ],
            }}
          >
            {(field) => {
              const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

              return (
                <EuiFormRow
                  id="taskType"
                  fullWidth
                  label={
                    <FormattedMessage
                      id="xpack.stackConnectors.components.inference.taskTypeLabel"
                      defaultMessage="Task type"
                    />
                  }
                  isInvalid={isInvalid}
                  error={errorMessage}
                >
                  {isEdit || readOnly ? (
                    <EuiButton
                      css={{
                        background: euiTheme.colors.disabled,
                        color: euiTheme.colors.lightestShade,
                      }}
                      data-test-subj="taskTypeSelectDisabled"
                      isDisabled
                    >
                      {config.taskType}
                    </EuiButton>
                  ) : taskTypeOptions.length === 1 ? (
                    <EuiButton
                      css={{
                        background: euiTheme.colors.darkShade,
                        color: euiTheme.colors.lightestShade,
                      }}
                      data-test-subj="taskTypeSelectSingle"
                      onClick={() => onTaskTypeOptionsSelect(config.taskType)}
                    >
                      {config.taskType}
                    </EuiButton>
                  ) : (
                    <EuiButtonGroup
                      data-test-subj="taskTypeSelect"
                      buttonSize="m"
                      legend="Task type"
                      defaultValue={DEFAULT_TASK_TYPE}
                      idSelected={config.taskType}
                      onChange={(id) => onTaskTypeOptionsSelect(id)}
                      options={taskTypeOptions}
                      color="text"
                      type="single"
                    />
                  )}
                </EuiFormRow>
              );
            }}
          </UseField>
          <EuiSpacer size="s" />
          <ConnectorConfigurationFormItems
            itemsGrow={false}
            isLoading={false}
            direction="column"
            items={taskTypeFormFields}
            setConfigEntry={onSetTaskTypeConfigEntry}
          />
        </>
      ) : null,
    [
      selectedTaskType,
      config?.taskType,
      xsFontSize,
      euiTheme.colors,
      taskTypeFormFields,
      onSetTaskTypeConfigEntry,
      isEdit,
      readOnly,
      taskTypeOptions,
      onTaskTypeOptionsSelect,
    ]
  );

  const inferenceUri = useMemo(() => `_inference/${selectedTaskType}/`, [selectedTaskType]);

  return (
    <EuiAccordion
      id="inferenceAdditionalOptions"
      data-test-subj="inferenceAdditionalOptions"
      buttonProps={{ css: buttonCss }}
      css={css`
        .euiAccordion__triggerWrapper {
          display: inline-flex;
        }
      `}
      element="fieldset"
      arrowDisplay="right"
      arrowProps={{
        color: 'primary',
      }}
      buttonElement="button"
      borders="none"
      buttonContent={
        <EuiTextColor color={euiTheme.colors.primary}>
          <FormattedMessage
            id="xpack.stackConnectors.components.inference.additionalOptionsLabel"
            defaultMessage="Additional options"
          />
        </EuiTextColor>
      }
      initialIsOpen={true}
    >
      <EuiSpacer size="m" />
      <EuiPanel hasBorder={true}>
        {optionalProviderFormFields.length > 0 ? (
          <>
            <EuiTitle size="xxs" data-test-subj="provider-optional-settings-label">
              <h4>
                <FormattedMessage
                  id="xpack.stackConnectors.components.inference.providerOptionalSettingsLabel"
                  defaultMessage="Service settings"
                />
              </h4>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <div
              css={css`
                font-size: ${xsFontSize};
                color: ${euiTheme.colors.textSubdued};
              `}
            >
              <FormattedMessage
                id="xpack.stackConnectors.components.inference.providerOptionalSettingsHelpLabel"
                defaultMessage="Configure the inference provider. These settings are optional provider settings."
              />
            </div>
            <EuiSpacer size="m" />
            <ConnectorConfigurationFormItems
              itemsGrow={false}
              isLoading={false}
              direction="column"
              items={optionalProviderFormFields}
              setConfigEntry={onSetProviderConfigEntry}
            />
            <EuiSpacer size="m" />
          </>
        ) : null}

        {taskTypeSettings}
        <EuiHorizontalRule />
        <EuiTitle size="xxs" data-test-subj="task-type-details-label">
          <h4>
            <FormattedMessage
              id="xpack.stackConnectors.components.inference.inferenceEndpointLabel"
              defaultMessage="Inference Endpoint"
            />
          </h4>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <div
          css={css`
            font-size: ${xsFontSize};
            color: ${euiTheme.colors.textSubdued};
          `}
        >
          <FormattedMessage
            id="xpack.stackConnectors.components.inference.inferenceEndpointHelpLabel"
            defaultMessage="Inference endpoints provide a simplified method for using this configuration, ecpecially from the API"
          />
        </div>
        <EuiSpacer size="s" />

        <UseField path="config.inferenceId">
          {(field) => {
            const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

            return (
              <EuiFormRow
                id="inferenceId"
                isInvalid={isInvalid}
                error={errorMessage}
                fullWidth
                helpText={
                  <FormattedMessage
                    id="xpack.stackConnectors.components.inference.inferenceIdHelpLabel"
                    defaultMessage="This ID cannot be changed once created."
                  />
                }
              >
                <EuiFieldText
                  fullWidth
                  disabled={isEdit || readOnly}
                  value={config.inferenceId}
                  onChange={(e) => {
                    setFieldValue('config.inferenceId', e.target.value);
                  }}
                  prepend={inferenceUri}
                  append={
                    <EuiCopy
                      beforeMessage={i18n.COPY_TOOLTIP}
                      afterMessage={i18n.COPIED_TOOLTIP}
                      textToCopy={`${inferenceUri}${config.inferenceId}`}
                    >
                      {(copy) => (
                        <EuiButtonEmpty
                          iconType="copy"
                          size="xs"
                          iconSide="right"
                          onClick={copy}
                          data-test-subj="copyInferenceUriToClipboard"
                        >
                          <FormattedMessage
                            id="xpack.stackConnectors.components.inference.copyLabel"
                            defaultMessage="Copy"
                          />
                        </EuiButtonEmpty>
                      )}
                    </EuiCopy>
                  }
                />
              </EuiFormRow>
            );
          }}
        </UseField>
      </EuiPanel>
    </EuiAccordion>
  );
};

// eslint-disable-next-line import/no-default-export
export { AdditionalOptionsConnectorFields as default };
