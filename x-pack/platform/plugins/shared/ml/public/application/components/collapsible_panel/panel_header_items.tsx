/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { type FC } from 'react';
import { useEuiTheme } from '@elastic/eui';

export interface PanelHeaderItems {
  headerItems: React.ReactElement[];
  compressed?: boolean;
}

export const PanelHeaderItems: FC<PanelHeaderItems> = ({ headerItems, compressed = false }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup gutterSize={compressed ? 's' : 'l'} alignItems={'center'}>
      {headerItems.map((item, i) => {
        return (
          <EuiFlexItem key={i} grow={false}>
            <div
              css={
                i < headerItems?.length - 1
                  ? {
                      borderRight: euiTheme.border.thin,
                      paddingRight: compressed ? euiTheme.size.s : euiTheme.size.l,
                    }
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
