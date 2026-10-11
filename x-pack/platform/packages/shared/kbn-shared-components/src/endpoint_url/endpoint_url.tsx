/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import {
  EuiButtonIcon,
  EuiCode,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { flexItemStyle, typeSelectorStyle, urlStyle } from './endpoint_url_styles';

export interface EndpointUrlProps {
  url: string | null;
  isLoading: boolean;
  copyAriaLabel: string;
  /** Complete `data-telemetry-id` for the copy button, so each host keeps its own namespace. */
  copyTelemetryId: string;
  copyTestSubj?: string;
  /** Rendered inside the panel, left of the url, e.g. a connection type picker. */
  typeSelector?: ReactNode;
  /** Helper text below the panel. Omit it for the compact form. */
  description?: ReactNode;
}

export const EndpointUrl = ({
  url,
  isLoading,
  copyAriaLabel,
  copyTelemetryId,
  copyTestSubj,
  typeSelector,
  description,
}: EndpointUrlProps) => {
  if (isLoading) {
    return <EuiLoadingSpinner size="m" data-test-subj="endpointUrlLoading" />;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiPanel paddingSize="xs" hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          {typeSelector && (
            <EuiFlexItem
              grow={false}
              css={typeSelectorStyle}
              data-test-subj="endpointUrlTypeSelector"
            >
              {typeSelector}
            </EuiFlexItem>
          )}
          <EuiFlexItem css={flexItemStyle}>
            <EuiCode transparentBackground css={urlStyle} data-test-subj="endpointUrlValue">
              {url}
            </EuiCode>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCopy textToCopy={url || ''}>
              {(copy) => (
                <EuiToolTip
                  content={i18n.translate('xpack.sharedComponents.endpointUrl.copyTooltip', {
                    defaultMessage: 'Copy',
                  })}
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    iconType="copy"
                    onClick={copy}
                    aria-label={copyAriaLabel}
                    data-test-subj={copyTestSubj}
                    data-telemetry-id={copyTelemetryId}
                  />
                </EuiToolTip>
              )}
            </EuiCopy>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      {description && (
        <EuiText size="xs" color="subdued" data-test-subj="endpointUrlDescription">
          <p>{description}</p>
        </EuiText>
      )}
    </EuiFlexGroup>
  );
};
