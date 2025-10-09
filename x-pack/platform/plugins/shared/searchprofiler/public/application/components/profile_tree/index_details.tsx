/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiToolTip, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { msToPretty } from '../../lib';
import type { Index } from '../../types';
import { useSharedDetailsStyles } from './styles';

export interface Props {
  index: Index;
}

const useStyles = () => {
  return {
    indexDetails: css`
      align-self: center;
    `,
    shardDetails: useSharedDetailsStyles().shardDetails,
    shardDetailsDim: useSharedDetailsStyles().shardDetailsDim,
  };
};

export const IndexDetails = ({ index }: Props) => {
  const { time, name } = index;
  const styles = useStyles();

  return (
    <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" direction="row">
      {/* Index Title group */}
      <EuiFlexItem grow={false}>
        <EuiText css={styles.shardDetails}>
          <h3>
            <b>
              {i18n.translate('xpack.searchProfiler.profileTree.indexTitle', {
                defaultMessage: 'Index:',
              })}
            </b>
            {' ' + name}
          </h3>
        </EuiText>
      </EuiFlexItem>
      {/* Time details group */}
      <EuiFlexItem grow={false} css={styles.indexDetails}>
        <EuiText css={styles.shardDetailsDim}>
          <EuiToolTip
            position="bottom"
            content={i18n.translate('xpack.searchProfiler.profileTree.cumulativeTimeTooltip', {
              defaultMessage:
                'The cumulative time of all shards in the index. Note: this is not wall-clock time, as shards can execute in parallel.',
            })}
          >
            <small>
              {i18n.translate('xpack.searchProfiler.profileTree.cumulativeTimeTitle', {
                defaultMessage: 'Cumulative time:',
              })}
            </small>
          </EuiToolTip>
          {' ' + msToPretty(time, 3)}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
