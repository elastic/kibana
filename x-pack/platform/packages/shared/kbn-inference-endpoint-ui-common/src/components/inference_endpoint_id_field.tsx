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
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
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
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { FormattedMessage } from '@kbn/i18n-react';

import * as LABELS from '../translations';
import type { Config } from '../types/types';

const inferenceIdConfig = {
  validations: [
    {
      validator: fieldValidators.emptyField(LABELS.getRequiredMessage('Inference endpoint ID')),
      isBlocking: true,
    },
  ],
};

interface InferenceEndpointIdFieldProps {
  config: Config;
  selectedTaskType?: string;
  isEdit?: boolean;
}

export const InferenceEndpointIdField: React.FC<InferenceEndpointIdFieldProps> = ({
  config,
  selectedTaskType,
  isEdit,
}) => {
  const { setFieldValue } = useFormContext();
  const inferenceUri = useMemo(() => `_inference/${selectedTaskType ?? ''}/`, [selectedTaskType]);

  return (
    <>
      <EuiHorizontalRule margin="l" />
      <EuiTitle size="xxs">
        <h4>
          <FormattedMessage
            id="xpack.inferenceEndpointUICommon.components.inferenceEndpointHeading"
            defaultMessage="Inference endpoint"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <UseField path="config.inferenceId" config={inferenceIdConfig}>
        {(field) => {
          const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
          return (
            <EuiFormRow
              id="inferenceId"
              fullWidth
              isInvalid={isInvalid}
              error={errorMessage}
              label={
                <FormattedMessage
                  id="xpack.inferenceEndpointUICommon.components.additionalInfo.inferenceIdLabel"
                  defaultMessage="Inference endpoint ID"
                />
              }
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
                append={
                  <EuiCopy
                    beforeMessage={LABELS.COPY_TOOLTIP}
                    afterMessage={LABELS.COPIED_TOOLTIP}
                    textToCopy={config.inferenceId ?? ''}
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
            </EuiFormRow>
          );
        }}
      </UseField>
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
              <code>{`${inferenceUri}${config.inferenceId ?? ''}`}</code>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCopy
              beforeMessage={LABELS.COPY_TOOLTIP}
              afterMessage={LABELS.COPIED_TOOLTIP}
              textToCopy={`${inferenceUri}${config.inferenceId ?? ''}`}
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
    </>
  );
};
