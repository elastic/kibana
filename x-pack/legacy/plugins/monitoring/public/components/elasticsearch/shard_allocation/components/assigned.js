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
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiKeyboardAccessible,
} from '@elastic/eui';

function getColor(classes) {
  const classList = classes.split(' ');

  if (classList.includes('emergency')) {
    return 'danger';
  }

  if (classList.includes('unassigned')) {
    if (classList.includes('replica')) {
      return 'warning';
    }
    return 'danger';
  }

  if (classList.includes('relocating')) {
    return 'accent';
  }

  if (classList.includes('initializing')) {
    return 'default';
  }

  if (classList.includes('primary')) {
    return 'primary';
  }

  if (classList.includes('replica')) {
    return 'secondary';
  }
}

function sortByName(item) {
  if (item.type === 'node') {
    return [!item.master, item.name];
  }
  return [item.name];
}

const colorToColorTypeMap = {
  green: 'success',
  yellow: 'warning',
  red: 'danger',
};

export class Assigned extends React.Component {
  createShard = shard => {
    const type = shard.primary ? 'primary' : 'replica';
    const key = `${shard.index}.${shard.node}.${type}.${shard.state}.${shard.shard}`;
    const classes = calculateClass(shard);
    const color = getColor(classes);
    console.log(color, 'COLOR');
    return <Shard shard={shard} key={key} />;
  };

  createChild = data => {
    const key = data.id;
    const initialClasses = ['monChild'];
    const shardStats = get(this.props.shardStats.indices, key);
    if (shardStats) {
      initialClasses.push(shardStats.status);
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
    const status = shardStats ? shardStats.status : undefined;
    return (
      <EuiFlexItem
        // grow={false}
        className={calculateClass(data, initialClasses.join(' '))}
        key={key}
        data-test-subj={`clusterView-Assigned-${key}`}
        data-status={shardStats && shardStats.status}
      >
        <EuiFlexGroup className="shardLegendItem" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="none">{shards}</EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false} className="monTitle eui-textNoWrap">
            {name}
            {master}
          </EuiFlexItem>
          <EuiFlexItem className="monHealth" grow={false}>
            <EuiIcon type="dot" color={colorToColorTypeMap[status]} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  };

  render() {
    const data = sortBy(this.props.data, sortByName).map(this.createChild);
    return (
      <td>
        <EuiFlexGrid columns={3} className="monChildren">
          {data}
        </EuiFlexGrid>
      </td>
    );
  }
}
