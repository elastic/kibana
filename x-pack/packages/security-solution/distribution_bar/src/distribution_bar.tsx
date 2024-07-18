/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiBadge, useEuiTheme, EuiIcon, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';

/** DistributionBar component props */
export interface DistributionBarProps {
  /** distribution data points */
  stats: Array<{ key: string; count: number; color: string; label: React.ReactElement }>;
  /** data-test-subj used for querying the component in tests */
  ['data-test-subj']?: string;
}

export interface EmptyBarProps {
  ['data-test-subj']?: string;
}

const styles = {
  base: css`
    position: relative;
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

  return <div css={emptyBarStyle} data-test-subj={`${dataTestSubj}__emptyBar`} />;
};

// TODO: handle stats with count 0
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
        &::after {
          content: '';
          opacity: 0;
          visibility: hidden;
          position: absolute;
          top: -10px;
          right: 0;
          width: 1px;
          height: 6px;
          background-color: ${euiTheme.colors.lightShade};
        }
        &:last-child::after {
          opacity: 1;
          visibility: visible;
        }
        &:last-child .label {
          opacity: 1;
          visibility: visible;
        }
        &:hover ~ div:last-child .label {
          opacity: 0;
          visibility: hidden;
        }
        &:hover ~ div:last-child::after {
          opacity: 0;
          visibility: hidden;
        }
        &:hover {
          height: 7px;
          border-radius: 3px;
          cursor: pointer;

          .label {
            opacity: 1;
            visibility: visible;
            top: calc(-${euiTheme.base + 2}px - 13px);
            transition: all 0.3s ease;
          }

          .euiBadge {
            cursor: unset;
          }

          &::after {
            opacity: 1;
            visibility: visible;
            transition: all 0.3s ease;
            top: -9px;
          }

          transition: all 0.3s ease;
        }
      `,
    ];

    return (
      <div key={stat.key} css={partStyle}>
        <div
          className={'label'}
          css={css`
            opacity: 0;
            visibility: hidden;
            position: absolute;
            width: 100%;
            height: calc(${euiTheme.base + 2}px + 14px); // for clickable area
            text-align: right;
            top: calc(
              -${euiTheme.base + 2}px - 14px
            ); // 2px border of the badge? 14px height of the line
            right: 0;
          `}
        >
          <EuiFlexGroup gutterSize={'none'} justifyContent={'flexEnd'} wrap={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge
                color={'hollow'}
                css={css`
                  border-bottom-right-radius: 0;
                  border-top-right-radius: 0;
                `}
              >
                {stat.count}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge
                color={'hollow'}
                css={css`
                  border-left: none;
                  border-bottom-left-radius: 0;
                  border-top-left-radius: 0;
                `}
              >
                <EuiFlexGroup gutterSize={'xs'} alignItems={'center'}>
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
      css={css`
        gap: ${euiTheme.size.xxs};
        min-height: 7px;
      `}
      data-test-subj={dataTestSubj}
    >
      {parts.length ? parts : <EmptyBar data-test-subj={dataTestSubj} />}
    </EuiFlexGroup>
  );
});
