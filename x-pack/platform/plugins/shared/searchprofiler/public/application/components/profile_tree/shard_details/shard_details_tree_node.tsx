/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiLink, EuiBadge, EuiCodeBlock, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { hasVisibleChild } from '../utils';
import { useHighlightTreeNode } from '../use_highlight_tree_node';
import { msToPretty } from '../../../lib';

import { PercentageBadge } from '../../percentage_badge';

import type { Index, Operation, Shard } from '../../../types';
import { useStyles } from './shard_details_tree_node.styles';

export interface Props {
  index: Index;
  shard: Shard;
  operation: Operation;
}

const TAB_WIDTH_PX = 32;

const limitString = (string: string, limit: number) =>
  `${string.slice(0, limit)}${string.length > limit ? '...' : ''}`;

/**
 * This component recursively renders a tree
 */
export const ShardDetailsTreeNode = ({ operation, index, shard }: Props) => {
  const [childrenVisible, setChildrenVisible] = useState(hasVisibleChild(operation));
  const { highlight, isHighlighted, id } = useHighlightTreeNode();
  const styles = useStyles();

  const renderTimeRow = (op: Operation) => (
    <div css={styles.tvRow}>
      <div css={styles.cell} className="euiTextAlign--left">
        {op.hasChildren ? (
          <EuiLink
            css={styles.shardDetails}
            disabled={!op.hasChildren}
            onClick={() => setChildrenVisible(!childrenVisible)}
          >
            <EuiIcon type={childrenVisible ? 'arrowDown' : 'arrowRight'} />

            {' ' + op.query_type}
          </EuiLink>
        ) : (
          <>
            <EuiIcon type="dot" />
            {' ' + op.query_type}
          </>
        )}
      </div>
      {/* Self Time Badge */}
      <div css={[styles.cell, styles.time]} className="euiTextAlign--center">
        <EuiBadge css={styles.badge} color={op.absoluteColor}>
          {msToPretty(op.selfTime || 0, 1)}
        </EuiBadge>
      </div>
      {/* Total Time Badge */}
      <div css={[styles.cell, styles.totalTime]} className="euiTextAlign--center">
        <EuiBadge css={styles.badge} color={op.absoluteColor}>
          {msToPretty(op.time, 1)}
        </EuiBadge>
      </div>
      {/* Time percentage Badge */}
      <div css={[styles.cell, styles.percentage]}>
        <PercentageBadge timePercentage={op.timePercentage} label={op.timePercentage + '%'} />
      </div>
    </div>
  );

  return (
    <>
      <div
        key={id}
        css={isHighlighted() ? styles.tvRowLast : undefined}
        style={{ paddingLeft: operation.depth! * TAB_WIDTH_PX + 'px' }}
      >
        {renderTimeRow(operation)}
        <div css={styles.tvRow}>
          <span css={styles.detail}>
            <EuiCodeBlock paddingSize="none">
              {limitString(operation.lucene || '', 120)}
            </EuiCodeBlock>
            <EuiLink
              type="button"
              data-test-subj="viewShardDetails"
              onClick={() => highlight({ indexName: index.name, operation, shard })}
            >
              {i18n.translate('xpack.searchProfiler.profileTree.body.viewDetailsLabel', {
                defaultMessage: 'View details',
              })}
            </EuiLink>
          </span>
        </div>
      </div>
      {childrenVisible &&
        operation.hasChildren &&
        operation.children.map((childOp, idx) => (
          <ShardDetailsTreeNode key={idx} operation={childOp} index={index} shard={shard} />
        ))}
    </>
  );
};
