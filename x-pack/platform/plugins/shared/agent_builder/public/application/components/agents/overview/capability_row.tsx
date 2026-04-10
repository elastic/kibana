/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

export interface CapabilityRowProps {
  count: number;
  label: string;
  description: string;
  actionLabel: string;
  onAction?: () => void;
}

export const CapabilityRow: React.FC<CapabilityRowProps> = ({
  count,
  label,
  description,
  actionLabel,
  onAction,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceBetween"
      responsive={false}
      css={css`
        border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};
        padding-bottom: ${euiTheme.size.m};
      `}
    >
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiText size="s">
              <strong>
                {i18n.translate('xpack.agentBuilder.overview.capabilities.countLabel', {
                  defaultMessage: '{count} {label}',
                  values: { count, label },
                })}
              </strong>
            </EuiText>
          </EuiFlexGroup>
          <EuiText size="xs" color="subdued">
            {description}
          </EuiText>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {onAction ? (
          <EuiButton size="s" onClick={onAction} data-test-subj={`capabilityRow-${label}-action`}>
            {actionLabel}
          </EuiButton>
        ) : (
          <EuiText size="s" color="subdued">
            <EuiIcon type="lock" size="s" aria-hidden={true} />
          </EuiText>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
