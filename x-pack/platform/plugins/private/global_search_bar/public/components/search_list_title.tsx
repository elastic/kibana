/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

interface SearchListTitleProps {
  title: string;
}

export const SearchListTitle: React.FC<SearchListTitleProps> = ({ title }) => {
  const { euiTheme } = useEuiTheme();
  
  const titleStyles = css`
    padding: 8px 16px;
    margin: 0;
    background-color: ${euiTheme.colors.lightestShade};
    border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};
    font-weight: ${euiTheme.font.weight.medium};
    color: ${euiTheme.colors.textSubdued};
  `;

  return (
    <div css={titleStyles} data-test-subj="search-title">
      <EuiText size="s">
        <h3 css={css`margin: 0; font-weight: inherit;`}>
          {title}
        </h3>
      </EuiText>
    </div>
  );
};
