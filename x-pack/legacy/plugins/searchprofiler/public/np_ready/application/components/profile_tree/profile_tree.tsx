/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { IndexDetails } from './index_details';
import { ShardDetails } from './shard_details';
import { initDataFor } from './init_data';
import { Targets, ShardSerialized } from '../../types';
import { HighlightContextProvider, OnHighlightChangeArgs } from './highlight_context';

export interface Props {
  target: Targets;
  data: ShardSerialized[] | null;
  onHighlight: (args: OnHighlightChangeArgs) => void;
}

export const ProfileTree = ({ data, target, onHighlight }: Props) => {
  if (!data || data.length === 0) {
    return null;
  }

  const sortedIndices = initDataFor(target)(data);

  return (
    <HighlightContextProvider onHighlight={onHighlight}>
      {sortedIndices.map(index => (
        <EuiFlexGroup key={index.name} direction="column">
          <EuiFlexItem>
            <IndexDetails index={index} target={target} />
          </EuiFlexItem>
          <EuiSpacer />
          <EuiFlexItem>
            {index.shards.map(shard => (
              <ShardDetails
                key={shard.id[1]}
                index={index}
                shard={shard}
                operations={shard[target]!}
              />
            ))}
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </HighlightContextProvider>
  );
};
