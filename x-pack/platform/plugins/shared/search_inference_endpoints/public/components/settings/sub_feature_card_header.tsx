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
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InferenceFeatureResponse as InferenceFeatureConfig } from '../../../common/types';
import { RecommendedDefaultsSwitch } from './recommended_defaults_switch';
import { SettingTitle } from './setting_title';

interface SubFeatureCardHeaderProps {
  featureId: string;
  feature: InferenceFeatureConfig;
  isFeatureDirty: boolean;
  isUsingRecommendedDefaults: boolean;
  hasAvailableRecommendedEndpoints: boolean;
  canManage: boolean;
  onToggleRecommendedDefaults: (checked: boolean) => void;
}

export const SubFeatureCardHeader: React.FC<SubFeatureCardHeaderProps> = ({
  featureId,
  feature: { featureName, featureDescription, isTechPreview, isBeta },
  isFeatureDirty,
  isUsingRecommendedDefaults,
  hasAvailableRecommendedEndpoints,
  canManage,
  onToggleRecommendedDefaults,
}) => (
  <>
    <EuiFlexGroup responsive={false}>
      <EuiFlexItem grow={false}>
        <SettingTitle
          heading="h4"
          data-test-subj={`subFeatureCardTitle-${featureId}`}
          isUnsaved={isFeatureDirty}
          title={featureName}
        />
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
      <p>{featureDescription}</p>
    </EuiText>
    <EuiSpacer size="s" />
    <RecommendedDefaultsSwitch
      featureId={featureId}
      checked={isUsingRecommendedDefaults}
      hasAvailableRecommendedEndpoints={hasAvailableRecommendedEndpoints}
      canManage={canManage}
      onChange={onToggleRecommendedDefaults}
    />
  </>
);
