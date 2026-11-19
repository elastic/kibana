/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { useEuiMemoizedStyles, type UseEuiTheme } from '@elastic/eui';

export interface ProposedActionsListProps {
  children: React.ReactNode;
  'data-test-subj'?: string;
}

const listStyles = ({ euiTheme }: UseEuiTheme) => css`
  margin: 0;
  padding: 0;
  list-style: none;
  border: ${euiTheme.border.thin};
  border-radius: ${euiTheme.size.m};
  background: ${euiTheme.colors.emptyShade};
  overflow: hidden;

  & > li + li {
    border-top: ${euiTheme.border.thin};
  }
`;

/**
 * The card holding the flyout's {@link ProposedActionButton} rows. Owns the border, corner radius
 * and row dividers, so a row never depends on whether it happens to be the first or last sibling.
 */
export const ProposedActionsList = memo<ProposedActionsListProps>(
  ({ children, 'data-test-subj': dataTestSubj }) => {
    const styles = useEuiMemoizedStyles(listStyles);

    return (
      <ul css={styles} data-test-subj={dataTestSubj}>
        {children}
      </ul>
    );
  }
);

ProposedActionsList.displayName = 'ProposedActionsList';
