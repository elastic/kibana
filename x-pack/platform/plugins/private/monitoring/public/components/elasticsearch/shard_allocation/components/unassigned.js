/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { sortBy } from 'lodash';
import { css } from '@emotion/react';
import { EuiFlexGroup, logicalCSS } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Shard } from './shard';

export const unassignedStyle = ({ euiTheme }) => css`
  vertical-align: middle;
  width: calc(${euiTheme.size.l} * 10);
`;

export const unassignedChildrenStyle = ({ euiTheme }) => css`
  ${logicalCSS('padding-top', euiTheme.size.l)}
`;

export class Unassigned extends React.Component {
  static displayName = i18n.translate(
    'xpack.monitoring.elasticsearch.shardAllocation.unassignedDisplayName',
    { defaultMessage: 'Unassigned' }
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
      <td css={unassignedStyle} data-test-subj="clusterView-Unassigned">
        <EuiFlexGroup wrap css={unassignedChildrenStyle}>
          {shards}
        </EuiFlexGroup>
      </td>
    );
  }
}
