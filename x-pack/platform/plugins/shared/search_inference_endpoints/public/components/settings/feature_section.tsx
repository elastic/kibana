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
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InferenceFeatureResponse as InferenceFeatureConfig } from '../../../common/types';
import { SubFeatureCard } from './sub_feature_card';

interface FeatureSettingItem {
  endpointIds: string[];
  effectiveRecommendedEndpoints: string[];
  feature: InferenceFeatureConfig;
  hasSavedObject: boolean;
  isFeatureDirty: boolean;
}

interface FeatureSectionProps {
  parentName: string;
  parentDescription: string;
  features: FeatureSettingItem[];
  onEndpointsChange: (featureId: string, newEndpointIds: string[]) => void;
  invalidEndpointIds: Set<string>;
  isTechPreview?: boolean;
  isBeta?: boolean;
  globalDefaultId: string;
}

export const FeatureSection: React.FC<FeatureSectionProps> = ({
  parentName,
  parentDescription,
  features,
  onEndpointsChange,
  invalidEndpointIds,
  isTechPreview = false,
  isBeta = false,
  globalDefaultId,
}) => {
  return (
    <EuiFlexGroup gutterSize="m" direction="column">
      <EuiFlexItem grow={false} data-test-subj={`featureSection-${parentName}`}>
        <EuiFlexGroup responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h3>{parentName}</h3>
            </EuiTitle>
          </EuiFlexItem>
          {(isTechPreview || isBeta) && (
            <EuiFlexItem grow={false}>
              <EuiBadgeGroup>
                {isTechPreview && (
                  <EuiBadge>
                    {i18n.translate('xpack.searchInferenceEndpoints.settings.techPreview', {
                      defaultMessage: 'Technical Preview',
                    })}
                  </EuiBadge>
                )}
                {isBeta && (
                  <EuiBadge>
                    {i18n.translate('xpack.searchInferenceEndpoints.settings.betaBadge', {
                      defaultMessage: 'Beta',
                    })}
                  </EuiBadge>
                )}
              </EuiBadgeGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>{parentDescription}</p>
        </EuiText>
      </EuiFlexItem>
      <EuiPanel hasBorder paddingSize="l">
        {features.length === 0 ? (
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.searchInferenceEndpoints.settings.featureSection.noSubFeatures',
                { defaultMessage: 'No registered sub-features.' }
              )}
            </p>
          </EuiText>
        ) : (
          <EuiFlexGroup direction="column" gutterSize="xl">
            {features.map(
              ({
                endpointIds,
                effectiveRecommendedEndpoints,
                feature,
                hasSavedObject,
                isFeatureDirty,
              }) => (
                <EuiFlexItem key={feature.featureId} grow={false}>
                  <SubFeatureCard
                    featureId={feature.featureId}
                    feature={feature}
                    endpointIds={endpointIds}
                    effectiveRecommendedEndpoints={effectiveRecommendedEndpoints}
                    onEndpointsChange={onEndpointsChange}
                    invalidEndpointIds={invalidEndpointIds}
                    hasSavedObject={hasSavedObject}
                    isFeatureDirty={isFeatureDirty}
                    globalDefaultId={globalDefaultId}
                  />
                </EuiFlexItem>
              )
            )}
          </EuiFlexGroup>
        )}
      </EuiPanel>
    </EuiFlexGroup>
  );
};
