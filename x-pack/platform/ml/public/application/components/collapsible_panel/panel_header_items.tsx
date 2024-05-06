/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { type FC } from 'react';
import { useCurrentThemeVars } from '../../contexts/kibana';

export interface PanelHeaderItems {
  headerItems: React.ReactElement[];
  compressed?: boolean;
}

export const PanelHeaderItems: FC<PanelHeaderItems> = ({ headerItems, compressed = false }) => {
  const { euiTheme } = useCurrentThemeVars();

  return (
    <EuiFlexGroup gutterSize={compressed ? 's' : 'l'} alignItems={'center'}>
      {headerItems.map((item, i) => {
        return (
          <EuiFlexItem key={i} grow={false}>
            <div
              css={
                i < headerItems?.length - 1
                  ? css`
                      border-right: ${euiTheme.euiBorderWidthThin} solid ${euiTheme.euiBorderColor};
                      padding-right: ${compressed
                        ? euiTheme.euiPanelPaddingModifiers.paddingSmall
                        : euiTheme.euiPanelPaddingModifiers.paddingLarge};
                    `
                  : null
              }
            >
              {item}
            </div>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
