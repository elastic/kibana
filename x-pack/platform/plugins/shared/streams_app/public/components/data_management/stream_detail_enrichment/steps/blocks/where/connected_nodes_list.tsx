/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { PropsWithChildren } from 'react';
import React from 'react';

export const ConnectedNodesList = ({ children }: PropsWithChildren) => {
  const { euiTheme } = useEuiTheme();

  return (
    <ul
      data-test-subj="streamsAppStreamDetailEnrichmentConnectedNodesList"
      css={css`
        position: relative;
        margin-left: 8px;

        ::after {
          content: '';
          position: absolute;
          left: -2px;
          top: -2.5px;
          width: 5px;
          height: 5px;
          background-color: ${euiTheme.colors.borderBasePlain};
          border-radius: 50%;
        }
        > li {
          border-left: 1px solid ${euiTheme.colors.borderBasePlain};
          padding-left: ${euiTheme.size.base};
          position: relative;
          padding-bottom: ${euiTheme.size.s};
        }
        > li::before {
          content: '';
          position: absolute;
          left: 0;
          top: ${euiTheme.size.base};
          width: 0;
          height: 1px;
          width: ${euiTheme.size.base};
          background-color: ${euiTheme.colors.borderBasePlain};
        }
        > li:last-child {
          border-left: none;
          padding-bottom: 0px;
        }

        > li:last-child::after {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          width: 1px;
          height: ${euiTheme.size.base};
          background-color: ${euiTheme.colors.borderBasePlain};
        }
      `}
    >
      {children}
    </ul>
  );
};
