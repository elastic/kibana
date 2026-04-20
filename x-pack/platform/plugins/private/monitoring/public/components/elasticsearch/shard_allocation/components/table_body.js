/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Unassigned } from './unassigned';
import { Assigned } from './assigned';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { euiFontSize } from '@elastic/eui';

const noShardsAllocatedMessageStyle = (theme) =>
  css({
    margin: `${theme.euiTheme.size.s} 0`,
    textAlign: 'center',
    fontSize: euiFontSize(theme, 'l').fontSize,
    lineHeight: euiFontSize(theme, 'l').lineHeight,
    fontWeight: theme.euiTheme.font.weight.light,
  });

const ShardRow = (props) => {
  let unassigned;
  if (props.data.unassigned && props.data.unassigned.length) {
    unassigned = <Unassigned shards={props.data.unassigned} />;
  } else {
    // TODO: No production label set in `../lib/labels` produces 3 columns. This branch
    // appears to be dead code from an older layout and should be removed.
    if (props.cols === 3) {
      unassigned = <td />;
    }
  }
  return (
    <tr>
      {unassigned}
      <Assigned shardStats={props.shardStats} data={props.data.children} />
    </tr>
  );
};

export class TableBody extends React.Component {
  static displayName = i18n.translate(
    'xpack.monitoring.elasticsearch.shardAllocation.tableBodyDisplayName',
    {
      defaultMessage: 'TableBody',
    }
  );

  createRow = (data, index) => {
    return <ShardRow key={`shardRow-${index}`} data={data} {...this.props} />;
  };

  render() {
    if (this.props.totalCount === 0) {
      return (
        <tbody>
          <tr>
            <td colSpan={this.props.cols}>
              <div>
                <p css={noShardsAllocatedMessageStyle}>
                  <FormattedMessage
                    id="xpack.monitoring.elasticsearch.shardAllocation.tableBody.noShardsAllocatedDescription"
                    defaultMessage="There are no shards allocated."
                  />
                </p>
              </div>
            </td>
          </tr>
        </tbody>
      );
    }

    if (this.props.shardStats) {
      if (this.props.rows.length) {
        return <tbody>{this.props.rows.map(this.createRow)}</tbody>;
      }
    }

    return (
      <tbody>
        <tr>
          <td colSpan={this.props.cols} />
        </tr>
      </tbody>
    );
  }
}
