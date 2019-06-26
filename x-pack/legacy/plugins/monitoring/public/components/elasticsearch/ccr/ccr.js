/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';
import {
  EuiInMemoryTable,
  EuiLink,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiIcon,
  EuiIconTip,
  EuiTextColor
} from '@elastic/eui';

import './ccr.css';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

function toSeconds(ms) {
  return Math.floor(ms / 1000) + 's';
}

export class Ccr extends Component {
  constructor(props) {
    super(props);
    this.state = {
      itemIdToExpandedRowMap: {},
    };
  }

  toggleShards(index, shards) {
    const itemIdToExpandedRowMap = {
      ...this.state.itemIdToExpandedRowMap
    };

    if (itemIdToExpandedRowMap[index]) {
      delete itemIdToExpandedRowMap[index];
    } else {
      let pagination = {
        initialPageSize: 5,
        pageSizeOptions: [5, 10, 20]
      };

      if (shards.length <= pagination.initialPageSize) {
        pagination = false;
      }

      itemIdToExpandedRowMap[index] = (
        <EuiInMemoryTable
          items={shards}
          columns={[
            {
              field: 'shardId',
              name: i18n.translate('xpack.monitoring.elasticsearch.ccr.shardsTable.shardColumnTitle', {
                defaultMessage: 'Shard'
              }),
              render: shardId => {
                return (
                  <EuiLink href={`#/elasticsearch/ccr/${index}/shard/${shardId}`}>
                    {shardId}
                  </EuiLink>
                );
              }
            },
            {
              render: () => null
            },
            {
              field: 'syncLagOps',
              name: i18n.translate('xpack.monitoring.elasticsearch.ccr.shardsTable.syncLagOpsColumnTitle', {
                defaultMessage: 'Sync Lag (ops)'
              }),
              render: (syncLagOps, data) => (
                <span>
                  {syncLagOps}
                  &nbsp;&nbsp;
                  <EuiIconTip
                    size="m"
                    type="iInCircle"
                    content={(
                      <Fragment>
                        <span>
                          <FormattedMessage
                            id="xpack.monitoring.elasticsearch.ccr.shardsTable.syncLagOpsColumn.leaderLagTooltip"
                            defaultMessage="Leader lag: {syncLagOpsLeader}"
                            values={{
                              syncLagOpsLeader: data.syncLagOpsLeader
                            }}
                          />
                        </span>
                        <br/>
                        <span>
                          <FormattedMessage
                            id="xpack.monitoring.elasticsearch.ccr.shardsTable.syncLagOpsColumn.followerLagTooltip"
                            defaultMessage="Follower lag: {syncLagOpsFollower}"
                            values={{
                              syncLagOpsFollower: data.syncLagOpsFollower
                            }}
                          />
                        </span>
                      </Fragment>
                    )}
                    position="right"
                  />
                </span>
              )
            },
            {
              field: 'syncLagTime',
              name: i18n.translate(
                'xpack.monitoring.elasticsearch.ccr.shardsTable.lastFetchTimeColumnTitle',
                {
                  defaultMessage: 'Last fetch time'
                }
              ),
              render: syncLagTime => <span>{toSeconds(syncLagTime)}</span>
            },
            {
              field: 'opsSynced',
              name: i18n.translate('xpack.monitoring.elasticsearch.ccr.shardsTable.opsSyncedColumnTitle', {
                defaultMessage: 'Ops synced'
              }),
            },
            {
              field: 'error',
              name: i18n.translate('xpack.monitoring.elasticsearch.ccr.shardsTable.errorColumnTitle', {
                defaultMessage: 'Error'
              }),
              render: error => (
                <EuiTextColor color="danger">
                  {error}
                </EuiTextColor>
              )
            }
          ]}
          executeQueryOptions={{
            defaultFields: ['shardId']
          }}
          sorting={true}
          pagination={pagination}
        />
      );
    }
    this.setState({ itemIdToExpandedRowMap });
  }

  renderTable() {
    const { data } = this.props;
    const items = data;

    let pagination = {
      initialPageSize: 5,
      pageSizeOptions: [5, 10, 20]
    };

    if (items.length <= pagination.initialPageSize) {
      pagination = false;
    }

    const sorting = {
      sort: {
        field: 'index',
        direction: 'asc',
      },
    };

    return (
      <EuiInMemoryTable
        className="monitoringElasticsearchCcrListingTable"
        columns={[
          {
            field: 'index',
            name: i18n.translate('xpack.monitoring.elasticsearch.ccr.ccrListingTable.indexColumnTitle', {
              defaultMessage: 'Index'
            }),
            sortable: true,
            render: (index, { shards }) => {
              const expanded = !!this.state.itemIdToExpandedRowMap[index];
              return (
                <EuiLink onClick={() => this.toggleShards(index, shards)}>
                  {index}
                  &nbsp;
                  { expanded ? <EuiIcon type="arrowUp" /> : <EuiIcon type="arrowDown" /> }
                </EuiLink>
              );
            }
          },
          {
            field: 'follows',
            sortable: true,
            name: i18n.translate('xpack.monitoring.elasticsearch.ccr.ccrListingTable.followsColumnTitle', {
              defaultMessage: 'Follows'
            }),
          },
          {
            field: 'syncLagOps',
            sortable: true,
            name: i18n.translate(
              'xpack.monitoring.elasticsearch.ccr.ccrListingTable.syncLagOpsColumnTitle',
              {
                defaultMessage: 'Sync Lag (ops)'
              }
            ),
          },
          {
            field: 'syncLagTime',
            sortable: true,
            name: i18n.translate(
              'xpack.monitoring.elasticsearch.ccr.ccrListingTable.lastFetchTimeColumnTitle',
              {
                defaultMessage: 'Last fetch time'
              }
            ),
            render: syncLagTime => <span>{toSeconds(syncLagTime)}</span>
          },
          {
            field: 'opsSynced',
            sortable: true,
            name: i18n.translate(
              'xpack.monitoring.elasticsearch.ccr.ccrListingTable.opsSyncedColumnTitle',
              {
                defaultMessage: 'Ops synced'
              }
            ),
          },
          {
            field: 'error',
            sortable: true,
            name: i18n.translate('xpack.monitoring.elasticsearch.ccr.ccrListingTable.errorColumnTitle', {
              defaultMessage: 'Error'
            }),
            render: error => (
              <EuiTextColor color="danger">
                {error}
              </EuiTextColor>
            )
          }
        ]}
        items={items}
        pagination={pagination}
        executeQueryOptions={{
          defaultFields: ['index', 'follows']
        }}
        sorting={sorting}
        itemId="id"
        itemIdToExpandedRowMap={this.state.itemIdToExpandedRowMap}
      />
    );
  }

  render() {
    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent>
            <EuiPageContentBody>
              {this.renderTable()}
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}
