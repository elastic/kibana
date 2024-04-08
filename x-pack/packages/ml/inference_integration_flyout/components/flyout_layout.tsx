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
import React, { useMemo, useState } from 'react';
import { isFieldEmpty, serviceTypeMap } from '../lib/shared_values';
import type { Service, ModelConfig } from '../types';
import type { SaveMappingOnClick } from './inference_flyout_wrapper';
import { SaveInferenceEndpoint } from './save_inference_mappings_button';
// import { SaveInferenceEndpoint } from './save_inference_mappings_button';

interface GenericInferenceFlyoutProps extends SaveMappingOnClick {
  inferenceComponent: React.ReactNode;
  description: string;
  service: Service;
  isSaveButtonEmpty: boolean;
  modelConfig: ModelConfig;
}

export const InferenceFlyout: React.FC<GenericInferenceFlyoutProps> = ({
  inferenceComponent,
  description,
  modelConfig,
  onSaveInferenceEndpoint,
  isSaveButtonEmpty = false,
  service,
}) => {
  const [inferenceEndpointId, setInferenceEndpointId] = useState<string>('');

  const isSaveButtonDisabled = useMemo(() => {
    return isFieldEmpty(inferenceEndpointId) || isSaveButtonEmpty;
  }, [inferenceEndpointId, isSaveButtonEmpty]);

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
          >
            <EuiFieldText
              data-test-subj="inferenceEndpointId"
              placeholder={i18n.translate(
                'xpack.ml.addInferenceEndpoint.elasticsearchModels.inferenceEndpointIdForm.placeholder',
                {
                  defaultMessage: 'Inference endpoint id',
                }
              )}
              value={inferenceEndpointId}
              onChange={(e) => setInferenceEndpointId(e.target.value)}
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
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
