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
  stats: Array<{ key: string; count: number; color: string }>;
}

const styles = {
  base: css`
    border-radius: 2px;
    height: 5px;
  `,
};

const EmptyBar = () => {
  const { euiTheme } = useEuiTheme();

  const emptyBarStyle = [
    styles.base,
    css`
      background-color: ${euiTheme.colors.lightShade};
      flex: 1;
    `,
  ];

  return <span css={emptyBarStyle} />;
};

export const DistributionBar: React.FC<DistributionBarProps> = React.memo(function DistributionBar(
  props
) {
  const { euiTheme } = useEuiTheme();
  const { stats } = props;
  const parts = stats.map((stat) => {
    const partStyle = [
      styles.base,
      css`
        background-color: ${stat.color};
        flex: ${stat.count};
      `,
    ];

    return <span key={stat.key} css={partStyle} />;
  });

  return (
    <EuiFlexGroup
      css={css`
        gap: ${euiTheme.size.xxs};
      `}
    >
      {parts.length ? parts : <EmptyBar />}
    </EuiFlexGroup>
  );
});
