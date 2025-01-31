/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { get, sortBy } from 'lodash';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, euiFontSize, logicalCSS } from '@elastic/eui';

import { Shard } from './shard';
import { getSafeForExternalLink } from '../../../../lib/get_safe_for_external_link';

const assignedChildrenStyle = ({ euiTheme }) => css`
  ${logicalCSS('padding-top', euiTheme.size.l)}
`;

const childTitleStyle = (theme) => css`
  ${logicalCSS('padding', `${theme.euiTheme.size.l} ${theme.euiTheme.size.s}`)}
  text-align: center;
  font-size: ${euiFontSize(theme, 'xs').fontSize};
  color: ${theme.euiTheme.colors.ghost};
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const shardStyle = (theme) => css`
  align-self: center;
  ${logicalCSS('padding', `${theme.euiTheme.size.xs} ${theme.euiTheme.size.s}`)}
  font-size: ${euiFontSize(theme, 'xs').fontSize};
  position: relative;
  display: inline-block;
`;

const childStyle = (data, shardStats) => (theme) =>
  css`
    float: left;
    align-self: center;
    background-color: ${theme.euiTheme.colors.lightestShade};
    margin: ${theme.euiTheme.size.s};
    border: 1px solid ${theme.euiTheme.colors.mediumShade};
    border-radius: ${theme.euiTheme.size.xs};
    ${logicalCSS('padding', `calc(${theme.euiTheme.size.xs} / 2) 0`)}

    ${data.type === 'index' &&
    logicalCSS(
      'border-left',
      `${theme.euiTheme.size.xs} solid ${theme.euiTheme.colors.borderStrongSuccess}`
    )}

    ${shardStats?.status === 'red' &&
    logicalCSS(
      'border-left',
      `${theme.euiTheme.size.xs} solid ${theme.euiTheme.colors.borderStrongDanger}`
    )}

    ${shardStats?.status === 'yellow' &&
    logicalCSS(
      'border-left',
      `${theme.euiTheme.size.xs} solid ${theme.euiTheme.colors.borderStrongWarning}`
    )}

    ${data.type === 'shard' && shardStyle(theme)}
  `;

const generateQueryAndLink = (data) => {
  let type = 'indices';
  let ident = data.name;
  if (data.type === 'node') {
    type = 'nodes';
    ident = data.id;
  }
  return getSafeForExternalLink(`#/elasticsearch/${type}/${ident}`);
};

function sortByName(item) {
  if (item.type === 'node') {
    return [!item.master, item.name];
  }
  return [item.name];
}

export class Assigned extends React.Component {
  createShard = (shard) => {
    const type = get(shard, 'shard.primary', shard.primary) ? 'primary' : 'replica';
    const key = `${get(shard, 'index.name', shard.index)}.${get(
      shard,
      'node.name',
      shard.node
    )}.${type}.${get(shard, 'shard.state', shard.state)}.${get(
      shard,
      'shard.number',
      shard.shard
    )}`;
    return <Shard shard={shard} key={key} />;
  };

  createChild = (data) => {
    const key = data.id;
    const shardStats = get(this.props.shardStats.indices, key);

    // TODO: redesign for shard allocation
    const name = <EuiLink href={generateQueryAndLink(data)}>{data.name}</EuiLink>;
    const master =
      data.node_type === 'master' ? <EuiIcon type="starFilledSpace" color="primary" /> : null;
    const shards = sortBy(data.children, 'shard').map(this.createShard);

    return (
      <EuiFlexItem
        grow={false}
        css={childStyle(data, shardStats)}
        key={key}
        data-test-subj={`clusterView-Assigned-${key}`}
        data-status={shardStats?.status}
      >
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem css={childTitleStyle} grow={false} className="eui-textNoWrap">
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
      <td>
        <EuiFlexGroup wrap css={assignedChildrenStyle}>
          {data}
        </EuiFlexGroup>
      </td>
    );
  }
}
