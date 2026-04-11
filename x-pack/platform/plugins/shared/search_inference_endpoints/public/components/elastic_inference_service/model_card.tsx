/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiAvatar,
  EuiBadge,
  EuiBadgeGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SERVICE_PROVIDERS } from '@kbn/inference-endpoint-ui-common';
import type { GroupedModel } from '../../utils/eis_utils';
import { getProviderKeyForCreator, TASK_TYPE_DISPLAY_NAME } from '../../utils/eis_utils';

interface ModelCardProps {
  model: GroupedModel;
}

export const ModelCard: React.FC<ModelCardProps> = ({ model }) => {
  const { modelName, modelCreator, taskTypes, categories } = model;
  const providerKey = getProviderKeyForCreator(modelCreator);
  const provider = providerKey ? SERVICE_PROVIDERS[providerKey] : undefined;

  const taskTypeLabels = taskTypes.map((tt) => TASK_TYPE_DISPLAY_NAME[tt] ?? tt).join(', ');

  return (
    <EuiPanel paddingSize="l" data-test-subj={`eisModelCard-${modelName}`} hasBorder>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiAvatar
            name={modelCreator}
            iconType={provider?.icon ?? 'machineLearningApp'}
            color="subdued"
            size="l"
            type="space"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>{modelName}</h4>
          </EuiTitle>
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
          </EuiBadgeGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
