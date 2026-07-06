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
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import {
  getFieldValidityAndErrorMessage,
  UseField,
  useFormContext,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { FormattedMessage } from '@kbn/i18n-react';

import * as LABELS from '../translations';
import { CHAT_COMPLETION_TASK_TYPE, DEFAULT_TASK_TYPE } from '../constants';
import type { Config } from '../types/types';
import type { TaskTypeOption } from '../utils/helpers';

interface AdditionalOptionsFieldsProps {
  config: Config;
  selectedTaskType?: string;
  taskTypeOptions: TaskTypeOption[];
  isEdit?: boolean;
  allowContextWindowLength?: boolean;
  allowTemperature?: boolean;
}

export const AdditionalOptionsFields: React.FC<AdditionalOptionsFieldsProps> = ({
  config,
  selectedTaskType,
  taskTypeOptions,
  isEdit,
  allowContextWindowLength,
  allowTemperature,
}) => {
  const { setFieldValue } = useFormContext();

  const showContextWindow =
    (taskTypeOptions?.some((option) => option.id === CHAT_COMPLETION_TASK_TYPE) ||
      (isEdit && selectedTaskType === CHAT_COMPLETION_TASK_TYPE)) &&
    allowContextWindowLength;
  const showTemperature =
    (selectedTaskType === CHAT_COMPLETION_TASK_TYPE || selectedTaskType === DEFAULT_TASK_TYPE) &&
    allowTemperature;

  const contextWindowLengthSettings = useMemo(
    () =>
      showContextWindow ? (
        <UseField
          path="config.contextWindowLength"
          config={{
            validations: [
              {
                validator: ({ value, path }) => {
                  if (value !== undefined && value !== null && value !== '') {
                    const numValue = Number(value);
                    if (!Number.isInteger(numValue) || numValue < 0) {
                      return {
                        code: 'ERR_FIELD_INVALID',
                        path,
                        message: LABELS.CONTEXT_WINDOW_VALIDATION_MESSAGE,
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
                id="contextWindowLength"
                fullWidth
                isInvalid={isInvalid}
                error={errorMessage}
                label={
                  <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                    <EuiFlexItem grow={false}>
                      <FormattedMessage
                        id="xpack.inferenceEndpointUICommon.components.additionalInfo.contextWindowLengthLabel"
                        defaultMessage="Context window length"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText color="subdued" size="xs">
                        {LABELS.OPTIONALTEXT}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
                helpText={
                  <FormattedMessage
                    id="xpack.inferenceEndpointUICommon.components.additionalInfo.contextWindowLengthHelpInfo"
                    defaultMessage="Can be set to manually define the context length of the default model used by the connector. Useful for open source or more recent models."
                  />
                }
                data-test-subj={'configuration-formrow-contextWindowLength'}
              >
                <EuiFormControlLayout
                  fullWidth
                  isInvalid={isInvalid}
                  clear={{
                    onClick: () => {
                      setFieldValue('config.contextWindowLength', '');
                    },
                  }}
                >
                  <EuiFieldNumber
                    min={0}
                    fullWidth
                    data-test-subj={'contextWindowLengthNumber'}
                    value={config.contextWindowLength ?? ''}
                    isInvalid={isInvalid}
                    onChange={(e) => {
                      setFieldValue('config.contextWindowLength', e.target.value);
                    }}
                  />
                </EuiFormControlLayout>
              </EuiFormRow>
            );
          }}
        </UseField>
      ) : null,
    [showContextWindow, setFieldValue, config.contextWindowLength]
  );

  const temperatureSettings = useMemo(
    () =>
      showTemperature ? (
        <UseField
          path="config.temperature"
          config={{
            validations: [
              {
                validator: ({ value, path }) => {
                  if (value !== undefined && value !== null && value !== '') {
                    const numValue = Number(value);
                    if (isNaN(numValue) || numValue < 0 || numValue > 1) {
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
                fullWidth
                isInvalid={isInvalid}
                error={errorMessage}
                label={
                  <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                    <EuiFlexItem grow={false}>
                      <FormattedMessage
                        id="xpack.inferenceEndpointUICommon.components.additionalInfo.temperatureLabel"
                        defaultMessage="Temperature"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText color="subdued" size="xs">
                        {LABELS.OPTIONALTEXT}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
                helpText={
                  <FormattedMessage
                    id="xpack.inferenceEndpointUICommon.components.additionalInfo.temperatureHelpInfo"
                    defaultMessage="Controls the randomness of the model's output. Changing the temperature can affect the general performance of AI Assistant and AI-driven features in Kibana, and we recommend keeping the default value."
                  />
                }
                data-test-subj={'configuration-formrow-temperatureSettings'}
              >
                <EuiFormControlLayout
                  fullWidth
                  isInvalid={isInvalid}
                  clear={{
                    onClick: () => {
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
      ) : null,
    [showTemperature, setFieldValue, config.temperature]
  );

  if (!contextWindowLengthSettings && !temperatureSettings) return null;

  return (
    <>
      <EuiHorizontalRule margin="l" />
      {contextWindowLengthSettings}
      {temperatureSettings && contextWindowLengthSettings && <EuiSpacer size="m" />}
      {temperatureSettings}
    </>
  );
};
