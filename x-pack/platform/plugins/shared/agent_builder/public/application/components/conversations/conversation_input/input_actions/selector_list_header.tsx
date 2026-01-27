/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiPopoverTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import type { PropsWithChildren } from 'react';
import React from 'react';
import { SELECTOR_LIST_HEADER_HEIGHT } from './input_actions.styles';

const listHeaderHeightStyles = css`
  block-size: ${SELECTOR_LIST_HEADER_HEIGHT}px;
`;

export const SelectorListHeader: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  return (
    <EuiPopoverTitle paddingSize="s" css={listHeaderHeightStyles}>
      <EuiFlexGroup
        responsive={false}
        justifyContent="spaceBetween"
        gutterSize="xs"
        alignItems="center"
      >
        {children}
      </EuiFlexGroup>
    </EuiPopoverTitle>
  );
};
