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
import { Shard, Targets } from '../../types';
import { HighlightContextProvider } from './highlight_context';

interface Props {
  target: Targets;
  data: Shard[];
}

export const ProfileTree = ({ data, target }: Props) => {
  if (data.length === 0) {
    return null;
  }

  const profileTreeData = initDataFor(target)(data);

  return (
    <HighlightContextProvider>
      {profileTreeData.map(index => (
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <IndexDetails index={index} target={target} />
          </EuiFlexItem>
          <EuiSpacer />
          <EuiFlexItem>
            {index.shards.map(shard => (
              <ShardDetails index={index} shard={shard} operations={shard[target]!} />
            ))}
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </HighlightContextProvider>
  );
};
