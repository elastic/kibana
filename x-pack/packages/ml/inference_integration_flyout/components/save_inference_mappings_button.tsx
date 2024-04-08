/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceModelConfig, InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import React, { useState, useEffect } from 'react';
import { isFieldEmpty } from '../lib/shared_values';
import { ModelConfig } from '../types';
import { saveMappingOnClick } from './inference_flyout_wrapper';

interface SaveInferenceEndpointProps extends saveMappingOnClick {
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
}) => {
  return (
    <EuiButton
      isDisabled={isSaveButtonDisabled}
      fill
      onClick={() => onSaveInferenceEndpoint(inferenceId, taskType, modelConfig)}
      type="submit"
    >
      {i18n.translate('xpack.ml.inferenceFlyoutWrapper.addInferenceEndpoint.saveInference', {
        defaultMessage: 'Save Inference Endpoint',
      })}
    </EuiButton>
  );
};
