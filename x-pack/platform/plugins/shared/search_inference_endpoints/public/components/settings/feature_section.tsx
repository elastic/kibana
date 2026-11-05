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
import { NO_DEFAULT_MODEL } from '../../../common/constants';
import type { EndpointDeprecationInfo, EndpointEfforts } from '../../types';
import { SubFeatureCard } from './sub_feature_card';

interface FeatureSettingItem {
  endpointIds: string[];
  effectiveRecommendedEndpoints: string[];
  efforts: EndpointEfforts;
  effectiveRecommendedEfforts: EndpointEfforts;
  feature: InferenceFeatureConfig;
  hasSavedObject: boolean;
  isFeatureDirty: boolean;
}

interface FeatureSectionProps {
  parentName: string;
  parentDescription: string;
  features: FeatureSettingItem[];
  onEndpointsChange: (featureId: string, newEndpointIds: string[]) => void;
  onEffortsChange: (featureId: string, newEfforts: EndpointEfforts) => void;
  invalidEndpointIds: Set<string>;
  deprecatedEndpointsMap: Map<string, EndpointDeprecationInfo>;
  isTechPreview?: boolean;
  isBeta?: boolean;
  globalDefaultId: string | undefined;
  canManage?: boolean;
}

export const FeatureSection: React.FC<FeatureSectionProps> = ({
  parentName,
  parentDescription,
  features,
  onEndpointsChange,
  onEffortsChange,
  invalidEndpointIds,
  deprecatedEndpointsMap,
  isTechPreview = false,
  isBeta = false,
  globalDefaultId,
  canManage = true,
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
                efforts,
                effectiveRecommendedEfforts,
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
                    efforts={efforts}
                    effectiveRecommendedEfforts={effectiveRecommendedEfforts}
                    onEffortsChange={onEffortsChange}
                    invalidEndpointIds={invalidEndpointIds}
                    deprecatedEndpointsMap={deprecatedEndpointsMap}
                    hasSavedObject={hasSavedObject}
                    isFeatureDirty={isFeatureDirty}
                    globalDefaultId={
                      feature.ignoreGlobalDefault
                        ? NO_DEFAULT_MODEL
                        : globalDefaultId ?? NO_DEFAULT_MODEL
                    }
                    canManage={canManage}
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
