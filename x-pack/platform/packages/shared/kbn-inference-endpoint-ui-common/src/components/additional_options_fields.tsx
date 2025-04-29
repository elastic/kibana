/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
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
  EuiButtonEmpty,
  EuiCopy,
  EuiButton,
  useEuiFontSize,
  EuiText,
} from '@elastic/eui';
import {
  getFieldValidityAndErrorMessage,
  UseField,
  useFormContext,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { FormattedMessage } from '@kbn/i18n-react';

import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { ConfigurationFormItems } from './configuration/configuration_form_items';
import * as LABELS from '../translations';
import { DEFAULT_TASK_TYPE } from '../constants';
import { Config, ConfigEntryView } from '../types/types';
import { TaskTypeOption } from '../utils/helpers';

// Custom trigger button CSS
const buttonCss = css`
  &:hover {
    text-decoration: none;
  }
`;

interface AdditionalOptionsFieldsProps {
  config: Config;
  optionalProviderFormFields: ConfigEntryView[];
  onSetProviderConfigEntry: (key: string, value: unknown) => Promise<void>;
  onTaskTypeOptionsSelect: (taskType: string, provider?: string) => void;
  selectedTaskType?: string;
  taskTypeOptions: TaskTypeOption[];
  isEdit?: boolean;
}

export const AdditionalOptionsFields: React.FC<AdditionalOptionsFieldsProps> = ({
  config,
  taskTypeOptions,
  optionalProviderFormFields,
  selectedTaskType,
  onSetProviderConfigEntry,
  onTaskTypeOptionsSelect,
  isEdit,
}) => {
  const xsFontSize = useEuiFontSize('xs').fontSize;
  const { euiTheme } = useEuiTheme();
  const { setFieldValue } = useFormContext();

  const taskTypeSettings = useMemo(
    () =>
      selectedTaskType || config.taskType?.length ? (
        <>
          <EuiTitle size="xxs" data-test-subj="task-type-details-label">
            <h4>
              <FormattedMessage
                id="xpack.inferenceEndpointUICommon.components.additionalInfo.taskTypeLabel"
                defaultMessage="Task type"
              />
            </h4>
          </EuiTitle>
          <EuiText
            css={css`
              font-size: ${xsFontSize};
              color: ${euiTheme.colors.textSubdued};
            `}
          >
            <FormattedMessage
              id="xpack.inferenceEndpointUICommon.components.additionalInfo.taskTypeHelpInfo"
              defaultMessage="Configure the inference task. Task types are specific to the service and model selected."
            />
          </EuiText>
          <EuiSpacer size="m" />
          <UseField
            path="config.taskType"
            config={{
              validations: [
                {
                  validator: fieldValidators.emptyField(LABELS.getRequiredMessage('Task type')),
                  isBlocking: true,
                },
              ],
            }}
          >
            {(field) => {
              const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

              return (
                <EuiFormRow id="taskType" fullWidth isInvalid={isInvalid} error={errorMessage}>
                  {isEdit ? (
                    <EuiButton data-test-subj="taskTypeSelectDisabled" isDisabled>
                      {config.taskType}
                    </EuiButton>
                  ) : taskTypeOptions.length === 1 ? (
                    <EuiButton
                      data-test-subj="taskTypeSelectSingle"
                      isDisabled
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
        </>
      ) : null,
    [
      selectedTaskType,
      config.taskType,
      xsFontSize,
      euiTheme.colors.textSubdued,
      isEdit,
      taskTypeOptions,
      onTaskTypeOptionsSelect,
    ]
  );

  const inferenceUri = useMemo(() => `_inference/${selectedTaskType}/`, [selectedTaskType]);

  return (
    <EuiAccordion
      id="inferenceAdditionalOptions"
      data-test-subj="inference-endpoint-additional-options"
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
            id="xpack.inferenceEndpointUICommon.components.additionalInfo.additionalOptionsLabel"
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
                  id="xpack.inferenceEndpointUICommon.components.additionalInfo.providerOptionalSettingsLabel"
                  defaultMessage="Service settings"
                />
              </h4>
            </EuiTitle>
            <EuiText
              css={css`
                font-size: ${xsFontSize};
                color: ${euiTheme.colors.textSubdued};
              `}
            >
              <FormattedMessage
                id="xpack.inferenceEndpointUICommon.components.additionalInfo.providerOptionalSettingsHelpLabel"
                defaultMessage="Configure the inference provider. These settings are optional provider settings."
              />
            </EuiText>
            <EuiSpacer size="m" />
            <ConfigurationFormItems
              isLoading={false}
              direction="column"
              items={optionalProviderFormFields}
              setConfigEntry={onSetProviderConfigEntry}
              isEdit={isEdit}
            />
            <EuiSpacer size="m" />
          </>
        ) : null}

        {taskTypeSettings}
        <EuiSpacer size="m" />
        <EuiTitle size="xxs" data-test-subj="task-type-details-label">
          <h4>
            <FormattedMessage
              id="xpack.inferenceEndpointUICommon.components.additionalInfo.inferenceEndpointLabel"
              defaultMessage="Inference Endpoint"
            />
          </h4>
        </EuiTitle>
        <EuiText
          css={css`
            font-size: ${xsFontSize};
            color: ${euiTheme.colors.textSubdued};
          `}
        >
          <FormattedMessage
            id="xpack.inferenceEndpointUICommon.components.additionalInfo.inferenceEndpointHelpLabel"
            defaultMessage="Inference endpoints provide a simplified method for using this configuration, ecpecially from the API"
          />
        </EuiText>
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
                    id="xpack.inferenceEndpointUICommon.components.additionalInfo.inferenceIdHelpLabel"
                    defaultMessage="This ID cannot be changed once created."
                  />
                }
              >
                <EuiFieldText
                  data-test-subj="inference-endpoint-input-field"
                  fullWidth
                  disabled={isEdit}
                  value={config.inferenceId}
                  onChange={(e) => {
                    setFieldValue('config.inferenceId', e.target.value);
                  }}
                  prepend={inferenceUri}
                  append={
                    <EuiCopy
                      beforeMessage={LABELS.COPY_TOOLTIP}
                      afterMessage={LABELS.COPIED_TOOLTIP}
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
                            id="xpack.inferenceEndpointUICommon.components.additionalInfo.copyLabel"
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
