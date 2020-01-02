/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, sortBy } from 'lodash';
import React from 'react';
import { Shard } from './shard';
import { calculateClass } from '../lib/calculate_class';
import { generateQueryAndLink } from '../lib/generate_query_and_link';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiKeyboardAccessible } from '@elastic/eui';

function sortByName(item) {
  if (item.type === 'node') {
    return [!item.master, item.name];
  }
  return [item.name];
}

export class Assigned extends React.Component {
  createShard = shard => {
    const type = shard.primary ? 'primary' : 'replica';
    const key = `${shard.index}.${shard.node}.${type}.${shard.state}.${shard.shard}`;
    return <Shard shard={shard} key={key} />;
  };

  createChild = data => {
    const key = data.id;
    const initialClasses = ['monChild'];
    const shardStats = get(this.props.shardStats.indices, key);
    if (shardStats) {
      switch (shardStats.status) {
        case 'red':
          initialClasses.push('monChild--danger');
          break;
        case 'yellow':
          initialClasses.push('monChild--warning');
          break;
      }
    }

    const changeUrl = () => {
      this.props.changeUrl(generateQueryAndLink(data));
    };

    // TODO: redesign for shard allocation, possibly giving shard display the
    // ability to use the euiLink CSS class (blue link text instead of white link text)
    const name = (
      <EuiKeyboardAccessible>
        <a onClick={changeUrl}>
          <span>{data.name}</span>
        </a>
      </EuiKeyboardAccessible>
    );
    const master =
      data.node_type === 'master' ? <EuiIcon type="starFilledSpace" color="primary" /> : null;
    const shards = sortBy(data.children, 'shard').map(this.createShard);
    return (
      <EuiFlexItem
        grow={false}
        className={calculateClass(data, initialClasses.join(' '))}
        key={key}
        data-test-subj={`clusterView-Assigned-${key}`}
        data-status={shardStats && shardStats.status}
      >
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem grow={false} className="monChild__title eui-textNoWrap">
            <EuiFlexGroup gutterSize="xs">
              <EuiFlexItem grow={false}>{name}</EuiFlexItem>
              <EuiFlexItem grow={false}>{master}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s">{shards}</EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  };

  render() {
    const data = sortBy(this.props.data, sortByName).map(this.createChild);
    return (
      <td className="monAssigned">
        <EuiFlexGroup wrap className="monAssigned__children">
          {data}
        </EuiFlexGroup>
      </td>
    );
  }
}
