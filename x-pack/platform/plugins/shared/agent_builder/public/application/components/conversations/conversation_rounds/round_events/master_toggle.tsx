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
  EuiLink,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

interface MasterToggleProps {
  expanded: boolean;
  onToggle: () => void;
}

/**
 * Round-level master toggle for the entire steps block.
 */
export const MasterToggle: React.FC<MasterToggleProps> = ({ expanded, onToggle }) => {
  const { euiTheme } = useEuiTheme();

  const label = expanded
    ? i18n.translate('xpack.agentBuilder.roundEvents.masterToggle.collapse', {
        defaultMessage: 'Collapse reasoning',
      })
    : i18n.translate('xpack.agentBuilder.roundEvents.masterToggle.show', {
        defaultMessage: 'Show reasoning',
      });

  const textDisabledStyles = css`
    color: ${euiTheme.colors.textDisabled};
  `;

  const linkStyles = css`
    color: ${euiTheme.colors.textDisabled};
    padding-top: ${euiTheme.size.s};
    padding-bottom: ${euiTheme.size.s};
  `;

  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiLink css={linkStyles} onClick={onToggle} role="button">
          <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" css={textDisabledStyles}>
                {label}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIcon type={expanded ? 'arrowUp' : 'arrowDown'} size="s" aria-hidden />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiLink>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
