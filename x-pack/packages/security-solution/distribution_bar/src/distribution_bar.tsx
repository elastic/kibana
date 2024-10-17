/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiBadge, useEuiTheme, EuiIcon, EuiFlexItem } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { css } from '@emotion/react';

/** DistributionBar component props */
export interface DistributionBarProps {
  /** distribution data points */
  stats: Array<{ key: string; count: number; color: string; label?: React.ReactNode }>;
  /** hide the label above the bar at first render */
  hideLastTooltip?: boolean;
  /** data-test-subj used for querying the component in tests */
  ['data-test-subj']?: string;
}

export interface EmptyBarProps {
  ['data-test-subj']?: string;
}

const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    bar: css`
      gap: ${euiTheme.size.xxs};
      min-height: 7px; // for hovered bar to have enough space to grow
    `,
    part: {
      base: css`
        position: relative;
        border-radius: 2px;
        height: 5px;
      `,
      empty: css`
        background-color: ${euiTheme.colors.lightShade};
        flex: 1;
      `,
      tick: css`
        &::after {
          content: '';
          opacity: 0;
          position: absolute;
          top: -10px;
          right: 0;
          width: 1px;
          height: 6px;
          background-color: ${euiTheme.colors.lightShade};
        }
      `,
      hover: css`
        &:hover {
          height: 7px;
          border-radius: 3px;

          .euiBadge {
            cursor: unset;
          }

          &::after {
            opacity: 1;
            transition: all 0.3s ease;
            top: -9px; // 10px - 1px to accommodate for height of hovered bar
          }

          transition: all 0.3s ease;
        }
      `,
      // last tooltip should be displayed initially even without hover
      lastTooltip: css`
        &:last-child > div {
          opacity: 1;
        }
        &:last-child::after {
          opacity: 1;
        }
        &:hover ~ div:last-child > div {
          opacity: 0;
        }
        &:hover ~ div:last-child::after {
          opacity: 0;
        }
      `,
    },
    tooltip: css`
      opacity: 0;
      position: absolute;
      width: 100%;
      height: calc(
        ${euiTheme.base + 2}px + 14px + 7px
      ); // 2px border of the badge + 14px height of the tick + 7px height of the bar
      text-align: right;
      top: calc(
        -${euiTheme.base + 2}px - 14px
      ); // 2px border of the badge + 14px height of the tick
      right: 0;

      &:hover {
        opacity: 1;
        top: calc(
          -${euiTheme.base + 2}px - 13px
        ); // 2px border of the badge + 14px height of the tick - 1px to accomodate for height of hovered bar
        transition: all 0.3s ease;
      }
    `,
    tooltipBadgeLeft: css`
      border-bottom-right-radius: 0;
      border-top-right-radius: 0;
    `,
    tooltipBadgeRight: css`
      border-left: none;
      border-bottom-left-radius: 0;
      border-top-left-radius: 0;
    `,
  };
};

const EmptyBar: React.FC<EmptyBarProps> = ({ 'data-test-subj': dataTestSubj }) => {
  const styles = useStyles();

  const emptyBarStyle = [styles.part.base, styles.part.empty];

  return <div css={emptyBarStyle} data-test-subj={`${dataTestSubj}`} />;
};

// TODO: fix tooltip direction if not enough space;
/**
 * Security Solution DistributionBar component.
 * Shows visual representation of distribution of stats, such as alerts by criticality or misconfiguration findings by evaluation result.
 */
export const DistributionBar: React.FC<DistributionBarProps> = React.memo(function DistributionBar(
  props
) {
  const styles = useStyles();
  const { stats, 'data-test-subj': dataTestSubj, hideLastTooltip } = props;
  const parts = stats.map((stat) => {
    const partStyle = [
      styles.part.base,
      styles.part.tick,
      styles.part.hover,
      css`
        background-color: ${stat.color};
        flex: ${stat.count};
      `,
    ];
    if (!hideLastTooltip) {
      partStyle.push(styles.part.lastTooltip);
    }

    const prettyNumber = numeral(stat.count).format('0,0a');

    return (
      <div key={stat.key} css={partStyle} data-test-subj={`${dataTestSubj}__part`}>
        <div css={styles.tooltip}>
          <EuiFlexGroup
            gutterSize={'none'}
            justifyContent={'flexEnd'}
            wrap={false}
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiBadge color={'hollow'} css={styles.tooltipBadgeLeft}>
                {prettyNumber}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color={'hollow'} css={styles.tooltipBadgeRight}>
                <EuiFlexGroup gutterSize={'xs'} alignItems={'center'} responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type={'dot'} size={'s'} color={stat.color} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>{stat.label ? stat.label : stat.key}</EuiFlexItem>
                </EuiFlexGroup>
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>
    );
  });

  return (
    <EuiFlexGroup
      alignItems={'center'}
      css={styles.bar}
      data-test-subj={dataTestSubj}
      responsive={false}
    >
      {parts.length ? parts : <EmptyBar data-test-subj={`${dataTestSubj}__emptyBar`} />}
    </EuiFlexGroup>
  );
});
