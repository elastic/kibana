/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export interface DistributionBarProps {
  data: Array<{ key: string; count: number; color: string }>;
}

export const DistributionBar: React.FC<DistributionBarProps> = React.memo(function DistributionBar(
  props
) {
  const { euiTheme } = useEuiTheme();
  const { data } = props;
  const items = data.map((item) => {
    return (
      <span
        key={item.key}
        css={css`
          background-color: ${item.color};
          border-radius: 2px;
          height: 5px;
          flex: ${item.count};
        `}
      />
    );
  });

  return (
    <EuiFlexGroup
      css={css`
        gap: ${euiTheme.size.xxs};
      `}
    >
      {items}
    </EuiFlexGroup>
  );
});
