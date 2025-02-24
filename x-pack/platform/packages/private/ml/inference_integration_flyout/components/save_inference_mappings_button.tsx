/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import React from 'react';
import type { ModelConfig } from '../types';
import type { SaveMappingOnClick } from './inference_flyout_wrapper';

interface SaveInferenceEndpointProps extends SaveMappingOnClick {
  inferenceId: string;
  taskType: InferenceTaskType;
  modelConfig: ModelConfig;
  isSaveButtonDisabled?: boolean;
}

export const SaveInferenceEndpoint: React.FC<SaveInferenceEndpointProps> = ({
  inferenceId,
  taskType,
  modelConfig,
  onSaveInferenceEndpoint,
  isSaveButtonDisabled,
  isCreateInferenceApiLoading,
}) => {
  return (
    <EuiButton
      isDisabled={isSaveButtonDisabled}
      fill
      isLoading={isCreateInferenceApiLoading}
      onClick={() => onSaveInferenceEndpoint(inferenceId, taskType, modelConfig)}
      type="submit"
    >
      {i18n.translate('xpack.ml.addInferenceEndpoint.saveInference', {
        defaultMessage: 'Save Inference Endpoint',
      })}
    </EuiButton>
  );
};
