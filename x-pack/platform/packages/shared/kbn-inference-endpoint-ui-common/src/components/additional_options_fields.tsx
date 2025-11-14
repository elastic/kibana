/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import {
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormControlLayout,
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
  EuiText,
} from '@elastic/eui';
import {
  getFieldValidityAndErrorMessage,
  UseField,
  useFormContext,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { FormattedMessage } from '@kbn/i18n-react';

import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import * as LABELS from '../translations';
import { CHAT_COMPLETION_TASK_TYPE, DEFAULT_TASK_TYPE } from '../constants';
import type { Config } from '../types/types';
import type { TaskTypeOption } from '../utils/helpers';
import { buttonCss, accordionCss } from './inference_service_form_fields';

const taskTypeConfig = {
  validations: [
    {
      validator: fieldValidators.emptyField(LABELS.getRequiredMessage('Task type')),
      isBlocking: true,
    },
  ],
};

interface AdditionalOptionsFieldsProps {
  config: Config;
  onTaskTypeOptionsSelect: (taskType: string, provider?: string) => void;
  selectedTaskType?: string;
  taskTypeOptions: TaskTypeOption[];
  isEdit?: boolean;
  allowContextWindowLength?: boolean;
  allowTemperature?: boolean;
}

export const AdditionalOptionsFields: React.FC<AdditionalOptionsFieldsProps> = ({
  config,
  taskTypeOptions,
  selectedTaskType,
  onTaskTypeOptionsSelect,
  isEdit,
  allowContextWindowLength,
  allowTemperature,
}) => {
  const { euiTheme } = useEuiTheme();
  const { setFieldValue } = useFormContext();

  const contextWindowLengthSettings = useMemo(
    () =>
      (taskTypeOptions?.some((option) => option.id === CHAT_COMPLETION_TASK_TYPE) ||
        (isEdit && selectedTaskType === CHAT_COMPLETION_TASK_TYPE)) &&
      allowContextWindowLength ? (
        <>
          <EuiTitle size="xxs" data-test-subj="context-window-length-details-label">
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <h4>
                  <FormattedMessage
                    id="xpack.inferenceEndpointUICommon.components.additionalInfo.contextWindowLengthLabel"
                    defaultMessage="Context window length"
                  />
                </h4>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText color="subdued" size="xs">
                  {LABELS.OPTIONALTEXT}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.inferenceEndpointUICommon.components.additionalInfo.contextWindowLengthHelpInfo"
              defaultMessage="Can be set to manually define the context length of the default model used by the connector. Useful for open source or more recent models."
            />
          </EuiText>
          <EuiSpacer size="m" />
          <UseField
            path="config.contextWindowLength"
            config={{
              validations: [
                {
                  validator: fieldValidators.isInteger({
                    message: LABELS.CONTEXT_WINDOW_VALIDATION_MESSAGE,
                  }),
                  isBlocking: true,
                },
                {
                  validator: ({ value, path }) => {
                    if (value && selectedTaskType !== CHAT_COMPLETION_TASK_TYPE) {
                      return {
                        code: 'ERR_FIELD_MISSING',
                        path,
                        message: LABELS.CONTEXT_WINDOW_TASK_TYPE_VALIDATION_MESSAGE,
                      };
                    }
                  },
                  isBlocking: true,
                },
              ],
            }}
          >
            {(field) => {
              const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
              // This ensures the check happens when task type changes, as well.
              const taskTypeError =
                config.contextWindowLength && selectedTaskType !== CHAT_COMPLETION_TASK_TYPE
                  ? LABELS.CONTEXT_WINDOW_TASK_TYPE_VALIDATION_MESSAGE
                  : undefined;
              return (
                <EuiFormRow
                  id="contextWindowLength"
                  fullWidth
                  isInvalid={isInvalid || Boolean(taskTypeError)}
                  error={errorMessage || taskTypeError}
                  data-test-subj={'configuration-formrow-contextWindowLength'}
                >
                  <EuiFormControlLayout
                    fullWidth
                    clear={{
                      onClick: (e) => {
                        setFieldValue('config.contextWindowLength', '');
                      },
                    }}
                  >
                    <EuiFieldNumber
                      min={0}
                      fullWidth
                      data-test-subj={'contextWindowLengthNumber'}
                      value={config.contextWindowLength ?? ''}
                      isInvalid={isInvalid || Boolean(taskTypeError)}
                      onChange={(e) => {
                        setFieldValue('config.contextWindowLength', e.target.value);
                      }}
                    />
                  </EuiFormControlLayout>
                </EuiFormRow>
              );
            }}
          </UseField>
          <EuiSpacer size="m" />
        </>
      ) : null,
    [
      selectedTaskType,
      setFieldValue,
      config.contextWindowLength,
      isEdit,
      allowContextWindowLength,
      taskTypeOptions,
    ]
  );

  const temperatureSettings = useMemo(
    () =>
      (selectedTaskType === CHAT_COMPLETION_TASK_TYPE || selectedTaskType === DEFAULT_TASK_TYPE) &&
      allowTemperature ? (
        <>
          <EuiTitle size="xxs" data-test-subj="temperature-details-label">
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <h4>
                  <FormattedMessage
                    id="xpack.inferenceEndpointUICommon.components.additionalInfo.temperatureLabel"
                    defaultMessage="Temperature"
                  />
                </h4>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText color="subdued" size="xs">
                  {LABELS.OPTIONALTEXT}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.inferenceEndpointUICommon.components.additionalInfo.temperatureHelpInfo"
              defaultMessage="Controls the randomness of the model's output. Changing the temperature can affect the general performance of AI Assistant and AI-driven features in Kibana, and we recommend keeping the default value."
            />
          </EuiText>
          <EuiSpacer size="m" />
          <UseField
            path="config.temperature"
            config={{
              validations: [
                {
                  validator: ({ value, path }) => {
                    if (value !== undefined && value !== null && value !== '') {
                      const numValue = Number(value);
                      if (isNaN(numValue) || numValue < 0) {
                        return {
                          code: 'ERR_FIELD_INVALID',
                          path,
                          message: LABELS.TEMPERATURE_VALIDATION_MESSAGE,
                        };
                      }
                    }
                  },
                  isBlocking: false,
                },
              ],
            }}
          >
            {(field) => {
              const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
              return (
                <EuiFormRow
                  id="temperatureSettings"
                  label={LABELS.TEMPERATURE_LABEL}
                  fullWidth
                  isInvalid={isInvalid}
                  error={errorMessage}
                  data-test-subj={'configuration-formrow-temperatureSettings'}
                >
                  <EuiFormControlLayout
                    fullWidth
                    clear={{
                      onClick: (e) => {
                        setFieldValue('config.temperature', undefined);
                      },
                    }}
                  >
                    <EuiFieldNumber
                      min={0}
                      max={1}
                      step={0.1}
                      fullWidth
                      data-test-subj={'temperatureSettingsNumber'}
                      value={config.temperature ?? ''}
                      isInvalid={isInvalid}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFieldValue('config.temperature', value === '' ? undefined : value);
                      }}
                    />
                  </EuiFormControlLayout>
                </EuiFormRow>
              );
            }}
          </UseField>
          <EuiSpacer size="m" />
        </>
      ) : null,
    [setFieldValue, config.temperature, selectedTaskType, allowTemperature]
  );

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
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.inferenceEndpointUICommon.components.additionalInfo.taskTypeHelpInfo"
              defaultMessage="Configure the inference task. Task types are specific to the service and model selected."
            />
          </EuiText>
          <EuiSpacer size="m" />
          <UseField path="config.taskType" config={taskTypeConfig}>
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
    [selectedTaskType, config.taskType, isEdit, taskTypeOptions, onTaskTypeOptionsSelect]
  );

  const inferenceUri = useMemo(() => `_inference/${selectedTaskType}/`, [selectedTaskType]);

  return (
    <EuiAccordion
      id="inferenceAdditionalOptions"
      data-test-subj="inference-endpoint-additional-settings"
      buttonProps={{ css: buttonCss }}
      css={accordionCss}
      element="fieldset"
      arrowDisplay="right"
      arrowProps={{
        color: 'primary',
      }}
      buttonElement="button"
      borders="none"
      buttonContent={
        <EuiTextColor
          color={euiTheme.colors.primary}
          data-test-subj="inference-endpoint-additional-settings-button"
        >
          <FormattedMessage
            id="xpack.inferenceEndpointUICommon.components.additionalInfo.additionalSettingsLabel"
            defaultMessage="Additional settings"
          />
        </EuiTextColor>
      }
      initialIsOpen={false}
    >
      <EuiSpacer size="m" />
      <EuiPanel hasBorder={true}>
        {taskTypeSettings}
        <EuiSpacer size="m" />
        <EuiTitle size="xxs" data-test-subj="inference-endpoint-details-label">
          <h4>
            <FormattedMessage
              id="xpack.inferenceEndpointUICommon.components.additionalInfo.inferenceEndpointLabel"
              defaultMessage="Inference Endpoint"
            />
          </h4>
        </EuiTitle>
        <EuiText size="xs" color="subdued">
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
                label={
                  <FormattedMessage
                    id="xpack.inferenceEndpointUICommon.components.additionalInfo.inferenceIdLabel"
                    defaultMessage="Inference ID"
                  />
                }
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
                  isInvalid={isInvalid}
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
        <EuiSpacer size="m" />
        {contextWindowLengthSettings}
        {temperatureSettings}
      </EuiPanel>
    </EuiAccordion>
  );
};
