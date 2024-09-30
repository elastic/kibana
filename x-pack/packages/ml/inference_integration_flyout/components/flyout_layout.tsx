/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo, useState } from 'react';
import { isEmpty, serviceTypeMap } from '../lib/shared_values';
import type { Service, ModelConfig } from '../types';
import type { SaveMappingOnClick } from './inference_flyout_wrapper';
import { SaveInferenceEndpoint } from './save_inference_mappings_button';

interface GenericInferenceFlyoutProps extends SaveMappingOnClick {
  inferenceComponent: React.ReactNode;
  description: string;
  service: Service;
  areRequiredFieldsEmpty: boolean;
  modelConfig: ModelConfig;
  onInferenceEndpointChange: (inferenceId: string) => void;
  inferenceEndpointError?: string;
}

export const InferenceFlyout: React.FC<GenericInferenceFlyoutProps> = ({
  inferenceComponent,
  description,
  modelConfig,
  onSaveInferenceEndpoint,
  areRequiredFieldsEmpty = false,
  service,
  isCreateInferenceApiLoading,
  onInferenceEndpointChange,
  inferenceEndpointError,
}) => {
  const [inferenceEndpointId, setInferenceEndpointId] = useState<string>('');
  const hasError: boolean = useMemo(() => {
    if (inferenceEndpointError !== undefined) {
      return !isEmpty(inferenceEndpointError);
    }
    return false;
  }, [inferenceEndpointError]);

  const onChangingInferenceEndpoint = useCallback(
    (value: any) => {
      setInferenceEndpointId(value);
      onInferenceEndpointChange(value);
    },
    [setInferenceEndpointId, onInferenceEndpointChange]
  );
  const isSaveButtonDisabled = useMemo(() => {
    return (
      isEmpty(inferenceEndpointId) ||
      areRequiredFieldsEmpty ||
      (inferenceEndpointError !== undefined && !isEmpty(inferenceEndpointError))
    );
  }, [inferenceEndpointId, areRequiredFieldsEmpty, inferenceEndpointError]);

  return (
    <EuiFlexGroup direction="column" justifyContent="spaceEvenly">
      <EuiFlexItem grow={false}>
        <EuiTitle size="s">
          <>{description}</>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>{inferenceComponent}</EuiFlexItem>

      <EuiFlexItem>
        <EuiForm component="form" fullWidth>
          <EuiFormRow
            label={i18n.translate(
              'xpack.ml.addInferenceEndpoint.elasticsearchModels.inferenceEndpointIdForm.label',
              {
                defaultMessage: 'Inference Endpoint ID:',
              }
            )}
            hasChildLabel={false}
            labelAppend={
              <EuiLink href="TODO" external target={'_blank'}>
                <FormattedMessage
                  id="xpack.ml.inferenceFlyoutWrapper.elasticsearchModels.inferenceEndpointIdForm.inferenceEnpointDocumentation"
                  defaultMessage="What's this?"
                />
              </EuiLink>
            }
            helpText={i18n.translate(
              'xpack.ml.addInferenceEndpoint.elasticsearchModels.inferenceEndpointIdForm.helpText',
              {
                defaultMessage: 'Must be unique. Only letters and underscores are allowed.',
              }
            )}
            isInvalid={hasError}
            error={
              <FormattedMessage
                id="xpack.ml.addInferenceEndpoint.elasticsearchModels.inferenceEndpointIdForm.error"
                defaultMessage="{formError}"
                values={{
                  formError: inferenceEndpointError,
                }}
              />
            }
          >
            <EuiFieldText
              data-test-subj="inferenceEndpointId"
              placeholder={i18n.translate(
                'xpack.ml.addInferenceEndpoint.elasticsearchModels.inferenceEndpointIdForm.placeholder',
                {
                  defaultMessage: 'Inference endpoint id',
                }
              )}
              isInvalid={hasError}
              value={inferenceEndpointId}
              onChange={(e) => onChangingInferenceEndpoint(e.target.value)}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlexItem>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <SaveInferenceEndpoint
            isSaveButtonDisabled={isSaveButtonDisabled}
            inferenceId={inferenceEndpointId}
            taskType={serviceTypeMap[service]}
            modelConfig={modelConfig}
            onSaveInferenceEndpoint={onSaveInferenceEndpoint}
            isCreateInferenceApiLoading={isCreateInferenceApiLoading}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
