/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SERVICE_PROVIDERS } from '@kbn/inference-endpoint-ui-common';
import type { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import * as translations from '../../../common/translations';
import { useQueryInferenceEndpoints } from '../../hooks/use_inference_endpoints';
import type { InferenceFeatureConfig } from './feature_metadata';
import { AddModelPopover } from './add_model_popover';

interface SubFeatureCardProps {
  featureId: string;
  feature: InferenceFeatureConfig;
  endpointIds: string[];
  onEndpointsChange: (featureId: string, newEndpointIds: string[]) => void;
}

export const SubFeatureCard: React.FC<SubFeatureCardProps> = ({
  featureId,
  feature,
  endpointIds,
  onEndpointsChange,
}) => {
  const { data: inferenceEndpoints = [] } = useQueryInferenceEndpoints();
  const [isExpanded, setIsExpanded] = useState(false);

  const iconMap = useMemo(
    () =>
      new Map(
        inferenceEndpoints.map((ep) => [
          ep.inference_id,
          SERVICE_PROVIDERS[ep.service as ServiceProviderKeys]?.icon ?? 'compute',
        ])
      ),
    [inferenceEndpoints]
  );

  const collapsedCount = 1;
  const hasOverflow = endpointIds.length > collapsedCount;
  const visibleEndpoints = isExpanded ? endpointIds : endpointIds.slice(0, collapsedCount);
  const hiddenCount = endpointIds.length - collapsedCount;
  const canAddMore =
    !feature.maxNumberOfEndpoints || endpointIds.length < feature.maxNumberOfEndpoints;

  const handleRemove = useCallback(
    (index: number) => {
      onEndpointsChange(
        featureId,
        endpointIds.filter((_, i) => i !== index)
      );
    },
    [endpointIds, featureId, onEndpointsChange]
  );

  const handleAdd = useCallback(
    (endpointId: string) => {
      onEndpointsChange(featureId, [...endpointIds, endpointId]);
    },
    [endpointIds, featureId, onEndpointsChange]
  );

  return (
    <EuiFlexGroup responsive={false} data-test-subj={`subFeatureCard-${featureId}`}>
      <EuiFlexItem grow={3}>
        <EuiTitle size="xs">
          <h4>{feature.featureName}</h4>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>{feature.featureDescription}</p>
        </EuiText>
        {feature.taskType && (
          <>
            <EuiSpacer size="s" />
            <div>
              <EuiBadge>{feature.taskType}</EuiBadge>
            </div>
          </>
        )}
      </EuiFlexItem>

      <EuiFlexItem grow={4}>
        <EuiPanel color="subdued" paddingSize="s" hasBorder={false}>
          <EuiText size="xs" color="subdued">
            <strong>{translations.SETTINGS_ASSIGNED_MODELS}</strong>
          </EuiText>
          <EuiSpacer size="s" />

          <EuiSplitPanel.Outer hasBorder>
            {visibleEndpoints.map((endpointId, index) => (
              <React.Fragment key={endpointId}>
                <EuiSplitPanel.Inner paddingSize="s" data-test-subj={`endpoint-row-${endpointId}`}>
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type={iconMap.get(endpointId) ?? 'compute'} size="m" aria-hidden />
                    </EuiFlexItem>
                    <EuiFlexItem grow>
                      <EuiText size="s">{endpointId}</EuiText>
                    </EuiFlexItem>
                    {index === 0 && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="hollow">{translations.SETTINGS_DEFAULT_BADGE}</EuiBadge>
                      </EuiFlexItem>
                    )}
                    {endpointIds.length > 1 && (
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          iconType="cross"
                          aria-label={i18n.translate(
                            'xpack.searchInferenceEndpoints.settings.removeModel',
                            { defaultMessage: 'Remove model' }
                          )}
                          size="s"
                          color="text"
                          onClick={() => handleRemove(index)}
                          data-test-subj={`remove-endpoint-${endpointId}`}
                        />
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </EuiSplitPanel.Inner>
                {index !== visibleEndpoints.length - 1 && <EuiHorizontalRule margin="none" />}
              </React.Fragment>
            ))}
          </EuiSplitPanel.Outer>

          <EuiSpacer size="xs" />
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            {hasOverflow && !isExpanded && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="arrowDown"
                  size="s"
                  onClick={() => setIsExpanded(true)}
                  data-test-subj={`show-more-${featureId}`}
                  color="text"
                >
                  {i18n.translate('xpack.searchInferenceEndpoints.settings.showMore', {
                    defaultMessage: 'Show {count} more',
                    values: { count: hiddenCount },
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            {(!hasOverflow || isExpanded) && canAddMore && (
              <EuiFlexItem grow={false}>
                <AddModelPopover existingEndpointIds={endpointIds} onAdd={handleAdd} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
