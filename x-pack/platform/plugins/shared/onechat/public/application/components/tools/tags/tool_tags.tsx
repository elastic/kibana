/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiBadgeGroup, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

interface OnechatToolTagsProps {
  tags: string[];
}

export const OnechatToolTags: React.FC<OnechatToolTagsProps> = ({ tags }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiBadgeGroup>
      {tags.map((tag) => (
        <EuiBadge
          key={tag}
          css={css`
            background-color: ${euiTheme.colors.backgroundBasePrimary};
            color: ${euiTheme.colors.textPrimary};
          `}
        >
          {tag}
        </EuiBadge>
      ))}
    </EuiBadgeGroup>
  );
};
