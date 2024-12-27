/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';
import React from 'react';
import { Shard } from './shard';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup } from '@elastic/eui';

export class Unassigned extends React.Component {
  static displayName = i18n.translate(
    'xpack.monitoring.elasticsearch.shardAllocation.unassignedDisplayName',
    {
      defaultMessage: 'Unassigned',
    }
  );

  createShard = (shard) => {
    const type = shard.primary ? 'primary' : 'replica';
    const additionId = shard.state === 'UNASSIGNED' ? Math.random() : '';
    const key =
      shard.index +
      '.' +
      shard.node +
      '.' +
      type +
      '.' +
      shard.state +
      '.' +
      shard.shard +
      additionId;
    return <Shard shard={shard} key={key} />;
  };

  render() {
    const shards = sortBy(this.props.shards, 'shard').map(this.createShard);
    return (
      <td className="monUnassigned" data-test-subj="clusterView-Unassigned">
        <EuiFlexGroup wrap className="monUnassigned__children">
          {shards}
        </EuiFlexGroup>
      </td>
    );
  }
}
