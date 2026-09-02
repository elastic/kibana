/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiBadge,
  EuiBadgeGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCard,
  EuiSpacer,
  EuiText,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SERVICE_PROVIDERS } from '@kbn/inference-endpoint-ui-common';
import type { GroupedModel } from '../../utils/eis_utils';
import { getProviderKeyForCreator, TASK_TYPE_DISPLAY_NAME } from '../../utils/eis_utils';
import { ModelStatusBadge } from '../model_status/model_status_badge';
import { EisModelStatus } from '../../types';

interface ModelCardProps {
  model: GroupedModel;
  onClick: () => void;
}

export const ModelCard: React.FC<ModelCardProps> = ({ model, onClick }) => {
  const { modelName, modelCreator, taskTypes, categories } = model;
  const providerKey = getProviderKeyForCreator(modelCreator);
  const provider = providerKey ? SERVICE_PROVIDERS[providerKey] : undefined;

  const taskTypeLabels = taskTypes.map((tt) => TASK_TYPE_DISPLAY_NAME[tt] ?? tt).join(', ');

  return (
    <EuiCard
      icon={<EuiIcon type={provider?.icon ?? 'machineLearningApp'} size="l" aria-hidden={true} />}
      title={modelName}
      titleSize="xs"
      textAlign="left"
      paddingSize="m"
      data-test-subj={`eisModelCard-${modelName}`}
      hasBorder
      onClick={onClick}
      display={model.modelStatus === EisModelStatus.DeprecatedEOL ? 'subdued' : 'plain'}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.searchInferenceEndpoints.eisModelCard.supports', {
              defaultMessage: 'Supports {taskTypes}',
              values: { taskTypes: taskTypeLabels },
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiSpacer size="m" />
        <EuiFlexItem grow={false}>
          <EuiBadgeGroup>
            {categories.map((cat) => (
              <EuiBadge key={cat} color="hollow">
                {cat}
              </EuiBadge>
            ))}
            <ModelStatusBadge
              id={model.modelName}
              metadata={model.modelMetadata}
              status={model.modelStatus}
            />
          </EuiBadgeGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCard>
  );
};
