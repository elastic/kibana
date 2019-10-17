/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { IndexDetails } from './index_details';
import { ShardDetails } from '../shard_details';
import { Index } from '../../types';

interface Props {
  target: string;
  index: Index;
}

export const ProfileTree = ({ index, target }: Props) => {
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <IndexDetails index={index} target={target} />
      </EuiFlexItem>
      <EuiSpacer />
      <EuiFlexItem>
        {index.shards.map(shard => (
          <SharedDetails />
        ))}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
