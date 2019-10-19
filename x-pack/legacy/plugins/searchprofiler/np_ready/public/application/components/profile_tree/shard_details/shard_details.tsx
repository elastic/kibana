/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiBadge, EuiLink, EuiIcon } from '@elastic/eui';

import { Index, Operation, Shard } from '../../../types';
import { msToPretty } from '../../../utils';
import { ShardDetailTree } from './shard_details_tree';

interface Props {
  index: Index;
  shard: Shard;
  operations: Operation[];
}

export const ShardDetails = ({ index, shard, operations }: Props) => {
  const { relative } = shard;

  const [shardVisibility, setShardVisibility] = useState<boolean>(false);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiText className="prfDevTool__shardDetails--dim">
          <EuiBadge style={{ '--prfDevToolProgressPercentage': shard.relative + '%' } as any}>
            <span className="prfDevTool__progress--percent-ie" style={{ width: relative + '%' }} />
            <span className="prfDevTool__progressText">{msToPretty(relative as number, 3)}</span>
          </EuiBadge>
        </EuiText>
        <EuiLink
          className="prfDevTool__shardDetails"
          onClick={() => setShardVisibility(!shardVisibility)}
        >
          <EuiIcon type={shardVisibility ? 'arrowDown' : 'arrowRight'} />[{shard.id[0]}][
          {shard.id[2]}]
        </EuiLink>
        {shardVisibility ? operations.map(data => <ShardDetailTree data={data} />) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
