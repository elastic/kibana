/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

export interface GroupedAttachmentListProps {
  children: React.ReactNode;
  className?: string;
  'data-test-subj'?: string;
}

/** The bordered card that holds `GroupedAttachmentRow`s, one rule between neighbours. */
export const GroupedAttachmentList = memo<GroupedAttachmentListProps>(
  ({ children, className, 'data-test-subj': dataTestSubj }) => {
    const { euiTheme } = useEuiTheme();

    return (
      <ul
        className={className}
        data-test-subj={dataTestSubj}
        css={css`
          margin: 0;
          padding: 0;
          list-style: none;
          border: ${euiTheme.border.thin};
          border-radius: 12px;
          background: ${euiTheme.colors.emptyShade};
          overflow: hidden;

          &:empty {
            display: none;
          }

          & > li + li {
            border-top: ${euiTheme.border.thin};
          }
        `}
      >
        {children}
      </ul>
    );
  }
);

GroupedAttachmentList.displayName = 'GroupedAttachmentList';
