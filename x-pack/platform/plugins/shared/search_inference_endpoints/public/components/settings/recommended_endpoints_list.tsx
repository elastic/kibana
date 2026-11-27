/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiIconTip,
  EuiSplitPanel,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { EndpointDeprecationInfo, EndpointEfforts } from '../../types';
import type { EndpointDisplay } from './types';
import { ModelStatusBadge } from '../model_status/model_status_badge';
import { EffortBadge } from './effort_badge';
import type { GlobalDefaultLockedRowProps } from './global_default_locked_row';
import { GlobalDefaultLockedRow } from './global_default_locked_row';

interface RecommendedEndpointsListProps {
  featureId: string;
  endpointIds: string[];
  efforts: EndpointEfforts;
  endpointDisplayMap: Map<string, EndpointDisplay>;
  invalidEndpointIds: Set<string>;
  deprecatedEndpointsMap: Map<string, EndpointDeprecationInfo>;
  globalDefaultRow?: Omit<GlobalDefaultLockedRowProps, 'featureId'>;
}

export const RecommendedEndpointsList: React.FC<RecommendedEndpointsListProps> = ({
  featureId,
  endpointIds,
  efforts,
  endpointDisplayMap,
  invalidEndpointIds,
  deprecatedEndpointsMap,
  globalDefaultRow,
}) => (
  <EuiSplitPanel.Outer hasBorder>
    {globalDefaultRow && <GlobalDefaultLockedRow featureId={featureId} {...globalDefaultRow} />}
    {endpointIds.map((endpointId, index) => {
      const { icon = 'processor', label = endpointId } = endpointDisplayMap.get(endpointId) ?? {};
      const isInvalid = invalidEndpointIds.has(endpointId);
      const deprecationInfo = deprecatedEndpointsMap.get(endpointId);
      const effort = efforts[endpointId];
      return (
        <div key={endpointId}>
          <EuiSplitPanel.Inner paddingSize="s" data-test-subj={`endpoint-row-${endpointId}`}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                {isInvalid ? (
                  <EuiIconTip
                    type="warning"
                    size="m"
                    color="warning"
                    content={i18n.translate(
                      'xpack.searchInferenceEndpoints.settings.endpointUnavailable',
                      { defaultMessage: 'This inference endpoint is no longer available' }
                    )}
                  />
                ) : (
                  <EuiIcon type={icon} size="m" color="subdued" aria-hidden />
                )}
              </EuiFlexItem>
              <EuiFlexItem
                grow
                css={css`
                  min-width: 0;
                `}
              >
                <EuiText size="s" color="subdued">
                  <span>{label}</span>
                </EuiText>
              </EuiFlexItem>
              {deprecationInfo && (
                <ModelStatusBadge
                  id={endpointId}
                  status={deprecationInfo.status}
                  metadata={deprecationInfo.metadata}
                />
              )}
              {effort !== undefined && (
                <EuiFlexItem grow={false}>
                  <EffortBadge endpointId={endpointId} effort={effort} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiSplitPanel.Inner>
          {index !== endpointIds.length - 1 && <EuiHorizontalRule margin="none" />}
        </div>
      );
    })}
  </EuiSplitPanel.Outer>
);
