/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

/** DistributionBar component props */
export interface DistributionBarProps {
  /** distribution data points */
  stats: Array<{ key: string; count: number; color: string }>;
  /** data-test-subj used for querying the component in tests */
  ['data-test-subj']?: string;
}

export interface EmptyBarProps {
  ['data-test-subj']?: string;
}

const styles = {
  base: css`
    border-radius: 2px;
    height: 5px;
  `,
};

const EmptyBar: React.FC<EmptyBarProps> = ({ 'data-test-subj': dataTestSubj }) => {
  const { euiTheme } = useEuiTheme();

  const emptyBarStyle = [
    styles.base,
    css`
      background-color: ${euiTheme.colors.lightShade};
      flex: 1;
    `,
  ];

  return <span css={emptyBarStyle} data-test-subj={`${dataTestSubj}__emptyBar`} />;
};

/**
 * Security Solution DistributionBar component.
 * Shows visual representation of distribution of stats, such as alerts by criticality or misconfiguration findings by evaluation result.
 */
export const DistributionBar: React.FC<DistributionBarProps> = React.memo(function DistributionBar(
  props
) {
  const { euiTheme } = useEuiTheme();
  const { stats, 'data-test-subj': dataTestSubj } = props;
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
      data-test-subj={dataTestSubj}
    >
      {parts.length ? parts : <EmptyBar data-test-subj={dataTestSubj} />}
    </EuiFlexGroup>
  );
});
