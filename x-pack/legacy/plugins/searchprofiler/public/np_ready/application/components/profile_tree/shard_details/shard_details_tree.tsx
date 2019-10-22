/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';

import { ShardDetailsTreeLeaf } from './shard_details_tree_leaf';
import { Index, Operation, Shard } from '../../../types';

export interface Props {
  data: Operation;
  index: Index;
  shard: Shard;
}

export const ShardDetailTree = ({ data, index, shard }: Props) => {
  // Recursively render the tree structure
  const renderOperations = (operation: Operation): JSX.Element => {
    const parent = operation.parent;
    const parentVisible = parent ? parent.visible : false;
    return (
      <>
        <ShardDetailsTreeLeaf
          shard={shard}
          index={index}
          parentVisible={parentVisible || operation.depth === 0}
          operation={operation}
        />
      </>
    );
  };

  return (
    <div className="treeviewwrapper">
      <div className="prfDevTool__tvHeader">
        <EuiText className="prfDevTool__cell prfDevTool__description">
          {i18n.translate('xpack.searchProfiler.profileTree.header.typeTitle', {
            defaultMessage: 'Type and description',
          })}
        </EuiText>
        <EuiText className="prfDevTool__cell prfDevTool__time">
          {i18n.translate('xpack.searchProfiler.profileTree.header.selfTimeTitle', {
            defaultMessage: 'Self time',
          })}
        </EuiText>
        <EuiText className="prfDevTool__cell prfDevTool__time">
          {i18n.translate('xpack.searchProfiler.profileTree.header.totalTimeTitle', {
            defaultMessage: 'Total time',
          })}
        </EuiText>
        <div className="prfDevTool__cell prfDevTool__percentage" />
      </div>

      {renderOperations(data)}
    </div>
  );
};
