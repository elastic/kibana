/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPanel,
  EuiSelect,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

export type DesignVersion = 'new-user' | 'regular-user';

interface VersionSelectorPanelProps {
  selectedVersion: DesignVersion;
  onVersionChange: (version: DesignVersion) => void;
}

const versionOptions = [
  { value: 'new-user', text: 'New user' },
  { value: 'regular-user', text: 'Regular user' },
];

export const VersionSelectorPanel: React.FC<VersionSelectorPanelProps> = ({
  selectedVersion,
  onVersionChange,
}) => {
  const { euiTheme } = useEuiTheme();

  const panelStyles = css({
    position: 'fixed',
    bottom: euiTheme.size.l,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: Number(euiTheme.levels.toast),
    minWidth: '250px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    borderRadius: '8px',
    backgroundColor: '#1a1c21', // Dark background
    border: '1px solid #343741', // Dark border
    animation: 'slideUp 0.3s ease-out',
    '@keyframes slideUp': {
      from: {
        opacity: 0,
        transform: 'translateX(-50%) translateY(20px)',
      },
      to: {
        opacity: 1,
        transform: 'translateX(-50%) translateY(0)',
      },
    },
  });

  const darkTextStyles = css({
    color: '#ddd !important', // Light text for dark background
  });

  const darkSelectStyles = css({
    '.euiFormControlLayout': {
      backgroundColor: '#25262e !important',
      borderColor: '#343741 !important',
    },
    '.euiFormControlLayout__childrenWrapper': {
      backgroundColor: '#25262e !important',
    },
    'select': {
      backgroundColor: '#25262e !important',
      color: '#ddd !important',
    },
    '&:hover .euiFormControlLayout': {
      borderColor: '#535966 !important',
    },
  });

  return (
    <EuiPanel
      css={panelStyles}
      paddingSize="m"
      hasBorder={false}
      hasShadow={false}
      color="transparent"
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s" css={darkTextStyles}>
            <strong>Design version:</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSelect
            css={darkSelectStyles}
            options={versionOptions}
            value={selectedVersion}
            onChange={(e) => onVersionChange(e.target.value as DesignVersion)}
            compressed
            aria-label="Select design version"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
