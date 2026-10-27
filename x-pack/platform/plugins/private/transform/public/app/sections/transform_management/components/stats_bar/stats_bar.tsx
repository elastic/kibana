/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, type ReactNode } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    statsBar: css`
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: ${euiTheme.size.xs};
      min-height: ${euiTheme.size.xl};
      margin-block-start: -${euiTheme.size.m};
      padding-block-end: ${euiTheme.size.l};
    `,
  };
};

interface StatsBarProps {
  stats: ReadonlyArray<{ key: string; content: ReactNode }>;
  dataTestSub: string;
}

export const StatsBar: FC<StatsBarProps> = ({ stats, dataTestSub }) => {
  const styles = useStyles();

  return (
    <div css={styles.statsBar} data-test-subj={dataTestSub}>
      {stats.map(({ key, content }, index) => (
        <React.Fragment key={key}>
          {index > 0 && <span aria-hidden="true">·</span>}
          <span>{content}</span>
        </React.Fragment>
      ))}
    </div>
  );
};
