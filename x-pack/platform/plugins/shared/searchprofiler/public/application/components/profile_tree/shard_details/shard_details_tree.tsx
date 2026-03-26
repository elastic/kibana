/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ShardDetailsTreeNode } from './shard_details_tree_node';
import type { Index, Operation, Shard } from '../../../types';
import { useStyles } from './shard_details_tree.styles';

export interface Props {
  data: Operation;
  index: Index;
  shard: Shard;
}

export const ShardDetailTree = ({ data, index, shard }: Props) => {
  const styles = useStyles();

  const renderOperations = (operation: Operation): JSX.Element => {
    const nextOperation = operation.treeRoot || operation;
    return <ShardDetailsTreeNode shard={shard} index={index} operation={nextOperation} />;
  };

  return (
    <div css={styles.panelBody}>
      <EuiFlexGroup responsive={false} gutterSize="none" direction="column">
        {/* Setting grow to false here is important for IE11. Don't change without testing first! */}
        <EuiFlexItem grow={false}>
          <div css={styles.tvHeader}>
            <EuiText size="s" className="euiTextAlign--left" css={styles.cell}>
              {i18n.translate('xpack.searchProfiler.profileTree.header.typeTitle', {
                defaultMessage: 'Type and description',
              })}
            </EuiText>
            <EuiText size="s" css={[styles.cell, styles.time]}>
              {i18n.translate('xpack.searchProfiler.profileTree.header.selfTimeTitle', {
                defaultMessage: 'Self time',
              })}
            </EuiText>
            <EuiText size="s" css={[styles.cell, styles.time]}>
              {i18n.translate('xpack.searchProfiler.profileTree.header.totalTimeTitle', {
                defaultMessage: 'Total time',
              })}
            </EuiText>
            <div css={[styles.cell, styles.percentage]} />
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{renderOperations(data)}</EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
