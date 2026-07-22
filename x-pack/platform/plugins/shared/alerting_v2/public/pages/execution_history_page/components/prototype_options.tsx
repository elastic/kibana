/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';

export interface PrototypeFlags {
  showCharts: boolean;
}

const DEFAULT_FLAGS: PrototypeFlags = {
  showCharts: false,
};

interface PrototypeOptionsProps {
  flags: PrototypeFlags;
  onChange: (flags: PrototypeFlags) => void;
}

export const usePrototypeFlags = () => {
  const [flags, setFlags] = useState<PrototypeFlags>(DEFAULT_FLAGS);
  return { flags, setFlags };
};

export const PrototypeOptions: React.FC<PrototypeOptionsProps> = ({ flags, onChange }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <EuiPanel
      hasShadow
      hasBorder
      paddingSize={collapsed ? 's' : 'm'}
      css={css`
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 9999;
        min-width: ${collapsed ? 'auto' : '240px'};
      `}
    >
      {collapsed ? (
        <EuiButtonIcon
          iconType="beaker"
          aria-label="Open prototype options"
          onClick={() => setCollapsed(false)}
          color="accent"
          display="fill"
        />
      ) : (
        <>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            gutterSize="s"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxxs">
                <h4>Prototype options</h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="minimize"
                aria-label="Collapse prototype options"
                onClick={() => setCollapsed(true)}
                size="xs"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiText size="xs" color="subdued" css={css({ marginBottom: 12 })}>
            Toggle between design variants
          </EuiText>
          <EuiSwitch
            label="KPIs with charts"
            checked={flags.showCharts}
            onChange={(e) => onChange({ ...flags, showCharts: e.target.checked })}
            compressed
          />
        </>
      )}
    </EuiPanel>
  );
};
