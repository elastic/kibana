/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { type FC } from 'react';

export interface StatsBarStat {
  label: string;
  value: string | number;
  show?: boolean;
}
interface StatProps {
  stat: StatsBarStat;
}

const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    stat: css`
      margin-right: ${euiTheme.size.s};
    `,
  };
};

export const Stat: FC<StatProps> = ({ stat }) => {
  const styles = useStyles();
  return (
    <span css={styles.stat}>
      <span>{stat.label}</span>: <strong>{stat.value}</strong>
    </span>
  );
};
