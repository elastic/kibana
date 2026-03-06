/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { EuiBadge, EuiText } from '@elastic/eui';
import { ELASTIC_MODEL_DEFINITIONS } from '@kbn/ml-trained-models-utils';

import { getModelId } from '../../../../utils/get_model_id';
import * as i18n from './translations';

interface ModelProps {
  endpointInfo: InferenceInferenceEndpointInfo;
}

export const Model: React.FC<ModelProps> = ({ endpointInfo }) => {
  const modelId = getModelId(endpointInfo);

  if (!modelId) {
    return null;
  }

  const modelDefinition = ELASTIC_MODEL_DEFINITIONS[modelId];
  const isEligibleForMITBadge = modelDefinition?.license === 'MIT';

  return (
    <div data-test-subj="model-cell-content">
      <EuiText size="s">{modelId}</EuiText>
      {isEligibleForMITBadge && (
        <EuiBadge
          color="hollow"
          iconType="popout"
          iconSide="right"
          href={modelDefinition.licenseUrl ?? ''}
          target="_blank"
          data-test-subj="mit-license-badge"
        >
          {i18n.MIT_LICENSE}
        </EuiBadge>
      )}
    </div>
  );
};
