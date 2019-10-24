/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiLink, EuiBadge, EuiCodeBlock, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { hasVisibleChild } from '../utils';
import { useHighlightTreeNode } from '../use_highlight_tree_node';
import { msToPretty } from '../../../utils';

import { Index, Operation, Shard } from '../../../types';

export interface Props {
  index: Index;
  shard: Shard;
  operation: Operation;
}

const TAB_WIDTH_PX = 32;

const limitString = (string: string, limit: number) =>
  `${string.slice(0, limit)}${string.length > limit ? '...' : ''}`;

/**
 * This is a component that recursively iterates over data to render out a tree like
 * structure in a flatly.
 */
export const ShardDetailsTreeNode = ({ operation, index, shard }: Props) => {
  const [childrenVisible, setChildrenVisible] = useState(hasVisibleChild(operation));
  const { highlight, isHighlighted, id } = useHighlightTreeNode();

  const renderTimeRow = (op: Operation) => (
    <div className="prfDevTool__tvRow">
      <div className="prfDevTool__cell prfDevTool__description">
        <EuiLink
          className="prfDevTool__shardDetails"
          disabled={!op.hasChildren}
          onClick={() => setChildrenVisible(!childrenVisible)}
        >
          {op.hasChildren ? (
            <EuiIcon type={childrenVisible ? 'arrowDown' : 'arrowRight'} />
          ) : (
            // Use dot icon for alignment if arrow isn't there
            <EuiIcon type={'dot'} />
          )}

          {op.query_type}
        </EuiLink>
      </div>
      {/* Self Time Badge */}
      <div className="prfDevTool__cell prfDevTool__time">
        <EuiBadge className="prfDevTool__badge" style={{ backgroundColor: op.absoluteColor }}>
          {msToPretty(op.selfTime!, 1)}
        </EuiBadge>
      </div>
      {/* Total Time Badge */}
      <div className="prfDevTool__cell prfDevTool__totalTime">
        <EuiBadge className="prfDevTool__badge" style={{ backgroundColor: op.absoluteColor }}>
          {msToPretty(op.time!, 1)}
        </EuiBadge>
      </div>
      {/* Time percentage Badge */}
      <div className="prfDevTool__cell prfDevTool__percentage">
        <EuiBadge
          className="prfDevTool__progress--percent"
          style={{ '--prfDevToolProgressPercentage': op.timePercentage } as any}
        >
          <span
            className="prfDevTool__progress--percent-ie"
            style={{ width: op.timePercentage + '%' }}
          />
          <span className="prfDevTool__progressText">{op.timePercentage + '%'}</span>
        </EuiBadge>
      </div>
    </div>
  );

  return (
    <>
      <div
        key={id}
        className={isHighlighted() ? 'prfDevTool__tvRow--last' : ''}
        style={{ paddingLeft: operation.depth! * TAB_WIDTH_PX + 'px' }}
      >
        <div className="prfDevTool__tvRow">{renderTimeRow(operation)}</div>
        <div className="prfDevTool__tvRow">
          <span className="prfDevTool__detail">
            <EuiCodeBlock paddingSize="none">
              {limitString(operation.lucene || '', 120)}
            </EuiCodeBlock>
            <EuiLink
              type="button"
              onClick={() => highlight({ indexName: index.name, operation, shard })}
            >
              {i18n.translate('xpack.searchProfiler.profileTree.body.viewDetailsLabel', {
                defaultMessage: 'View Details',
              })}
            </EuiLink>
          </span>
        </div>
      </div>
      {childrenVisible &&
        operation.hasChildren &&
        operation.children.flatMap((childOp, idx) => (
          <ShardDetailsTreeNode key={idx} operation={childOp} index={index} shard={shard} />
        ))}
    </>
  );
};
