/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiLink, EuiIcon } from '@elastic/eui';
import { css } from '@emotion/react';

import type { Index, Operation, Shard } from '../../../types';
import { msToPretty } from '../../../lib';
import { ShardDetailTree } from './shard_details_tree';
import { PercentageBadge } from '../../percentage_badge';
import { useSharedDetailsStyles } from '../styles';

interface Props {
  index: Index;
  shard: Shard;
  operations: Operation[];
}

const useStyles = () => {
  return {
    // Shard header flex item alignment
    shardHeaderFlexItem: css`
      align-self: center;
    `,

    // Shard details link styling
    shardDetails: useSharedDetailsStyles().shardDetails,

    // Dim styling for shard details
    shardDetailsDim: useSharedDetailsStyles().shardDetailsDim,
  };
};

const hasVisibleOperation = (ops: Operation[]): boolean => {
  for (const op of ops) {
    if (op.visible) {
      return true;
    }
    if (op.children?.length && hasVisibleOperation(op.children)) {
      return true;
    }
  }
  return false;
};

export const ShardDetails = ({ index, shard, operations }: Props) => {
  const { relative, time } = shard;
  const styles = useStyles();

  const [shardVisibility, setShardVisibility] = useState<boolean>(() =>
    hasVisibleOperation(operations.map((op) => op.treeRoot ?? op))
  );

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" direction="row">
        <EuiFlexItem grow={false} css={styles.shardHeaderFlexItem}>
          <EuiLink
            css={styles.shardDetails}
            onClick={() => setShardVisibility(!shardVisibility)}
            data-test-subj="openCloseShardDetails"
          >
            <EuiIcon type={shardVisibility ? 'arrowDown' : 'arrowRight'} />[{shard.id[0]}][
            {shard.id[2]}]
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={styles.shardHeaderFlexItem}>
          <EuiText css={styles.shardDetailsDim}>
            <PercentageBadge
              timePercentage={String(relative)}
              label={msToPretty(time as number, 3)}
              valueType={'time'}
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      {shardVisibility
        ? operations.map((data, idx) => (
            <ShardDetailTree key={idx} index={index} shard={shard} data={data} />
          ))
        : null}
    </>
  );
};
