/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import {
  EuiButtonIcon,
  EuiCopy,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormControlLayout,
  EuiFormAppend,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
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

interface AdditionalOptionsFieldsProps {
  config: Config;
  selectedTaskType?: string;
  isEdit?: boolean;
  allowContextWindowLength?: boolean;
  allowTemperature?: boolean;
}

export const AdditionalOptionsFields: React.FC<AdditionalOptionsFieldsProps> = ({
  config,
  selectedTaskType,
  isEdit,
  allowContextWindowLength,
  allowTemperature,
}) => {
  const { setFieldValue } = useFormContext();

  const contextWindowLengthSettings = useMemo(
    () =>
      selectedTaskType === CHAT_COMPLETION_TASK_TYPE && allowContextWindowLength ? (
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
    [selectedTaskType, setFieldValue, config.contextWindowLength, allowContextWindowLength]
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
          <EuiSpacer size="m" />
        </>
      ) : null,
    [setFieldValue, config.temperature, selectedTaskType, allowTemperature]
  );

  const inferenceUri = useMemo(() => `_inference/${selectedTaskType}/`, [selectedTaskType]);

  return (
    <>
      <EuiFormRow
        id="inferenceId"
        label={
          <FormattedMessage
            id="xpack.inferenceEndpointUICommon.components.additionalInfo.inferenceIdLabel"
            defaultMessage="Inference endpoint ID"
          />
        }
        fullWidth
        helpText={
          <FormattedMessage
            id="xpack.inferenceEndpointUICommon.components.additionalInfo.inferenceIdHelpLabel"
            defaultMessage="This ID cannot be changed once created."
          />
        }
      >
        <UseField path="config.inferenceId">
          {(field) => {
            const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
            return (
              <>
                <EuiFieldText
                  isInvalid={isInvalid}
                  data-test-subj="inference-endpoint-input-field"
                  fullWidth
                  disabled={isEdit}
                  value={config.inferenceId}
                  onChange={(e) => {
                    setFieldValue('config.inferenceId', e.target.value);
                  }}
                  append={
                    <EuiCopy
                      beforeMessage={LABELS.COPY_TOOLTIP}
                      afterMessage={LABELS.COPIED_TOOLTIP}
                      textToCopy={config.inferenceId}
                    >
                      {(copy) => (
                        <EuiFormAppend
                          element="button"
                          label={
                            <FormattedMessage
                              id="xpack.inferenceEndpointUICommon.components.additionalInfo.copyLabel"
                              defaultMessage="Copy"
                            />
                          }
                          iconRight="copy"
                          onClick={copy}
                        />
                      )}
                    </EuiCopy>
                  }
                />
                {isInvalid && errorMessage && (
                  <EuiText size="xs" color="danger">
                    {errorMessage}
                  </EuiText>
                )}
              </>
            );
          }}
        </UseField>
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiTitle size="xxxs">
        <h5>
          <FormattedMessage
            id="xpack.inferenceEndpointUICommon.components.additionalInfo.apiReferenceLabel"
            defaultMessage="API reference"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiPanel color="subdued" paddingSize="m">
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
          <EuiFlexItem grow>
            <EuiText size="s">
              <code>{`${inferenceUri}${config.inferenceId}`}</code>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCopy
              beforeMessage={LABELS.COPY_TOOLTIP}
              afterMessage={LABELS.COPIED_TOOLTIP}
              textToCopy={`${inferenceUri}${config.inferenceId}`}
            >
              {(copy) => (
                <EuiButtonIcon
                  iconType="copy"
                  aria-label={LABELS.COPY_TOOLTIP}
                  onClick={copy}
                  data-test-subj="inference-endpoint-api-reference-copy"
                />
              )}
            </EuiCopy>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      {contextWindowLengthSettings}
      {temperatureSettings}
    </>
  );
};
