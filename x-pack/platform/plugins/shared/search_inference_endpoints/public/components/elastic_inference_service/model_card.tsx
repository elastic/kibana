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
  EuiText,
  EuiIcon,
  useEuiTheme,
  type UseEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SERVICE_PROVIDERS } from '@kbn/inference-endpoint-ui-common';
import type { GroupedModel } from '../../utils/eis_utils';
import {
  getModelDeprecatedMessage,
  getModelEOLDate,
  getProviderKeyForCreator,
  isModelEndOfLifeReached,
  isModelNearingEndOfLife,
} from '../../utils/eis_utils';
import { getModelId } from '../../utils/get_model_id';
import { isModelUnavailableUnderRegionPolicy } from '../../utils/is_model_unavailable_under_region_policy';
import { ModelBlockedBadge } from '../model_status/model_blocked_badge';
import { ModelStatusBadge } from '../model_status/model_status_badge';
import { EisModelStatus } from '../../types';
import { ModelCardMetaRow } from './model_card_meta_row';

interface ModelCardProps {
  model: GroupedModel;
  onClick: () => void;
}

const modelCardBodyStyles = ({ euiTheme }: UseEuiTheme) => ({
  paddingBlockStart: euiTheme.size.s,
});

export const ModelCard: React.FC<ModelCardProps> = ({ model, onClick }) => {
  const euiThemeContext = useEuiTheme();
  const { modelName, modelCreator, categories } = model;
  const providerPrefix = `${modelCreator} `;
  const modelTitle = modelName.startsWith(providerPrefix)
    ? modelName.slice(providerPrefix.length)
    : modelName;
  const modelId = model.endpoints[0] ? getModelId(model.endpoints[0]) : undefined;
  const providerKey = getProviderKeyForCreator(modelCreator);
  const provider = providerKey ? SERVICE_PROVIDERS[providerKey] : undefined;
  const endOfLifeDate = getModelEOLDate(model.modelMetadata)?.format('YYYY-MM-DD');
  const endOfLifeReached = isModelEndOfLifeReached(model.modelMetadata);
  const nearingEndOfLife = isModelNearingEndOfLife(model.modelMetadata);

  return (
    <EuiCard
      icon={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon
              type={provider?.icon ?? 'machineLearningApp'}
              size="l"
              aria-hidden={true}
              data-test-subj={`eisModelCardProviderIcon-${modelName}`}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" data-test-subj={`eisModelCardProvider-${modelName}`}>
              {modelCreator}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      title={<span data-test-subj={`eisModelCardName-${modelName}`}>{modelTitle}</span>}
      titleSize="xs"
      textAlign="left"
      paddingSize="m"
      data-test-subj={`eisModelCard-${modelName}`}
      hasBorder
      onClick={onClick}
      display={endOfLifeReached ? 'subdued' : 'plain'}
    >
      <EuiFlexGroup
        direction="column"
        alignItems="flexStart"
        gutterSize="m"
        css={modelCardBodyStyles(euiThemeContext)}
      >
        <EuiFlexItem grow={false}>
          <EuiBadgeGroup>
            {categories.map((cat) => (
              <EuiBadge
                key={cat}
                color="hollow"
                data-test-subj={`eisModelCardCategory-${modelName}-${cat}`}
              >
                {cat}
              </EuiBadge>
            ))}
            {isModelUnavailableUnderRegionPolicy(model.endpoints, modelId ?? '') && (
              <ModelBlockedBadge id={model.modelName} />
            )}
            {model.modelStatus === EisModelStatus.Preview && (
              <ModelStatusBadge
                id={model.modelName}
                metadata={model.modelMetadata}
                status={model.modelStatus}
              />
            )}
          </EuiBadgeGroup>
        </EuiFlexItem>
        {endOfLifeDate && endOfLifeReached && (
          <EuiFlexItem grow={false}>
            <ModelCardMetaRow
              modelName={modelName}
              iconType="error"
              iconColor="subdued"
              textColor="subdued"
              message={i18n.translate('xpack.searchInferenceEndpoints.eisModelCard.endOfLife', {
                defaultMessage: 'End-of-life: {date}',
                values: { date: endOfLifeDate },
              })}
              tooltipTitle={i18n.translate(
                'xpack.searchInferenceEndpoints.eisModelCard.endOfLifeTooltip.title',
                { defaultMessage: 'Model no longer available' }
              )}
              tooltip={i18n.translate(
                'xpack.searchInferenceEndpoints.eisModelCard.endOfLifeTooltip.content',
                {
                  defaultMessage:
                    'This model was deprecated on {date}. We recommend a newer model for optimal results.',
                  values: { date: endOfLifeDate },
                }
              )}
              tooltipTestSubj={`eisModelCardEndOfLifeTooltip-${modelName}`}
            />
          </EuiFlexItem>
        )}
        {endOfLifeDate && nearingEndOfLife && (
          <EuiFlexItem grow={false}>
            <ModelCardMetaRow
              modelName={modelName}
              iconType="warning"
              iconColor="warning"
              textColor="warning"
              message={i18n.translate(
                'xpack.searchInferenceEndpoints.eisModelCard.nearingEndOfLife',
                {
                  defaultMessage: 'Nearing end-of-life: {date}',
                  values: { date: endOfLifeDate },
                }
              )}
              tooltipTitle={i18n.translate(
                'xpack.searchInferenceEndpoints.eisModelCard.nearingEndOfLifeTooltip.title',
                { defaultMessage: 'Model soon no longer available' }
              )}
              tooltip={getModelDeprecatedMessage(endOfLifeDate)}
              tooltipTestSubj={`eisModelCardNearingEndOfLifeTooltip-${modelName}`}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiCard>
  );
};
