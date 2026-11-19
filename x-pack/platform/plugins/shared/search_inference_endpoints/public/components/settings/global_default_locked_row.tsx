/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSplitPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { EndpointDeprecationInfo } from '../../types';
import { ModelStatusBadge } from '../model_status/model_status_badge';

export interface GlobalDefaultLockedRowProps {
  featureId: string;
  icon: string;
  label: string;
  showBadge: boolean;
  globalDefaultId: string;
  deprecationInfo?: EndpointDeprecationInfo;
}

export const GlobalDefaultLockedRow: React.FC<GlobalDefaultLockedRowProps> = ({
  featureId,
  icon,
  label,
  showBadge,
  globalDefaultId,
  deprecationInfo,
}) => (
  <>
    <EuiSplitPanel.Inner paddingSize="s" data-test-subj={`global-default-row-${featureId}`}>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiPanel color="transparent" paddingSize="none">
            <EuiIcon type="lock" size="s" color="subdued" aria-hidden />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon} size="m" aria-hidden />
        </EuiFlexItem>
        <EuiFlexItem
          grow
          css={css`
            min-width: 0;
          `}
        >
          <EuiToolTip title={label} content={globalDefaultId} position="top">
            <EuiText
              size="s"
              color="subdued"
              tabIndex={0}
              css={css`
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              `}
            >
              <span>{label}</span>
            </EuiText>
          </EuiToolTip>
        </EuiFlexItem>
        {showBadge && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj={`global-default-badge-${featureId}`}>
              {i18n.translate('xpack.searchInferenceEndpoints.settings.globalDefaultBadge', {
                defaultMessage: 'Global default',
              })}
            </EuiBadge>
          </EuiFlexItem>
        )}
        {deprecationInfo && (
          <EuiFlexItem grow={false}>
            <ModelStatusBadge
              id={globalDefaultId}
              status={deprecationInfo.status}
              metadata={deprecationInfo.metadata}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiSplitPanel.Inner>
    <EuiHorizontalRule margin="none" />
  </>
);
