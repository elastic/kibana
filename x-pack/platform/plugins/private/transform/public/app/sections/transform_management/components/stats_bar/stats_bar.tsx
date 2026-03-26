/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, type FC } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

import type { StatsBarStat } from './stat';
import { Stat } from './stat';

const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    statsBar: css`
      height: 42px;
      padding: 14px;
      background-color: ${euiTheme.colors.lightestShade};
    `,
  };
};

interface Stats {
  total: StatsBarStat;
  failed: StatsBarStat;
}

export interface TransformStatsBarStats extends Stats {
  batch: StatsBarStat;
  continuous: StatsBarStat;
  started: StatsBarStat;
  nodes?: StatsBarStat;
}

type StatsBarStats = TransformStatsBarStats;

interface StatsBarProps {
  stats: StatsBarStats;
  dataTestSub: string;
}

export const StatsBar: FC<StatsBarProps> = ({ stats, dataTestSub }) => {
  const styles = useStyles();
  const statsList = useMemo(() => Object.values(stats), [stats]);

  return (
    <div css={styles.statsBar} data-test-subj={dataTestSub}>
      {statsList
        .filter((s: StatsBarStat) => s.show)
        .map((s: StatsBarStat) => (
          <Stat key={s.label} stat={s} />
        ))}
    </div>
  );
};
