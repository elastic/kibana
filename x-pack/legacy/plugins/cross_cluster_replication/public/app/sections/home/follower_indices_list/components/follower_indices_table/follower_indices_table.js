/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiHealth,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiLoadingKibana,
  EuiOverlayMask,
} from '@elastic/eui';
import { API_STATUS, UIM_FOLLOWER_INDEX_SHOW_DETAILS_CLICK } from '../../../../../constants';
import {
  FollowerIndexPauseProvider,
  FollowerIndexResumeProvider,
  FollowerIndexUnfollowProvider,
} from '../../../../../components';
import routing from '../../../../../services/routing';
import { trackUiMetric, METRIC_TYPE } from '../../../../../services/track_ui_metric';
import { ContextMenu } from '../context_menu';

export class FollowerIndicesTable extends PureComponent {
  static propTypes = {
    followerIndices: PropTypes.array,
    selectFollowerIndex: PropTypes.func.isRequired,
  };

  state = {
    selectedItems: [],
  };

  onSearch = ({ query }) => {
    const { text } = query;
    const normalizedSearchText = text.toLowerCase();
    this.setState({
      queryText: normalizedSearchText,
    });
  };

  editFollowerIndex = id => {
    const uri = routing.getFollowerIndexPath(id, '/edit', false);
    routing.navigate(uri);
  };

  getFilteredIndices = () => {
    const { followerIndices } = this.props;
    const { queryText } = this.state;

    if (queryText) {
      return followerIndices.filter(followerIndex => {
        const { name, shards } = followerIndex;

        const inName = name.toLowerCase().includes(queryText);
        const inRemoteCluster = shards[0].remoteCluster.toLowerCase().includes(queryText);
        const inLeaderIndex = shards[0].leaderIndex.toLowerCase().includes(queryText);

        return inName || inRemoteCluster || inLeaderIndex;
      });
    }

    return followerIndices.slice(0);
  };

  getTableColumns() {
    const { selectFollowerIndex } = this.props;

    const actions = [
      /* Pause or resume follower index */
      {
        render: followerIndex => {
          const { name, isPaused } = followerIndex;
          const label = isPaused
            ? i18n.translate(
                'xpack.crossClusterReplication.followerIndexList.table.actionResumeDescription',
                {
                  defaultMessage: 'Resume replication',
                }
              )
            : i18n.translate(
                'xpack.crossClusterReplication.followerIndexList.table.actionPauseDescription',
                {
                  defaultMessage: 'Pause replication',
                }
              );

          return isPaused ? (
            <FollowerIndexResumeProvider>
              {resumeFollowerIndex => (
                <span onClick={() => resumeFollowerIndex(name)} data-test-subj="resumeButton">
                  <EuiIcon aria-label={label} type="play" className="euiContextMenu__icon" />
                  <span>{label}</span>
                </span>
              )}
            </FollowerIndexResumeProvider>
          ) : (
            <FollowerIndexPauseProvider>
              {pauseFollowerIndex => (
                <span
                  onClick={() => pauseFollowerIndex(followerIndex)}
                  data-test-subj="pauseButton"
                >
                  <EuiIcon aria-label={label} type="pause" className="euiContextMenu__icon" />
                  <span>{label}</span>
                </span>
              )}
            </FollowerIndexPauseProvider>
          );
        },
      },
      /* Edit follower index */
      {
        render: ({ name }) => {
          const label = i18n.translate(
            'xpack.crossClusterReplication.followerIndexList.table.actionEditDescription',
            {
              defaultMessage: 'Edit follower index',
            }
          );

          return (
            <span onClick={() => this.editFollowerIndex(name)} data-test-subj="editButton">
              <EuiIcon aria-label={label} type="pencil" className="euiContextMenu__icon" />
              <span>{label}</span>
            </span>
          );
        },
      },
      /* Unfollow leader index */
      {
        render: ({ name }) => {
          const label = i18n.translate(
            'xpack.crossClusterReplication.followerIndexList.table.actionUnfollowDescription',
            {
              defaultMessage: 'Unfollow leader index',
            }
          );

          return (
            <FollowerIndexUnfollowProvider>
              {unfollowLeaderIndex => (
                <span onClick={() => unfollowLeaderIndex(name)} data-test-subj="unfollowButton">
                  <EuiIcon aria-label={label} type="indexFlush" className="euiContextMenu__icon" />
                  <span>{label}</span>
                </span>
              )}
            </FollowerIndexUnfollowProvider>
          );
        },
      },
    ];

    return [
      {
        field: 'name',
        name: i18n.translate(
          'xpack.crossClusterReplication.followerIndexList.table.nameColumnTitle',
          {
            defaultMessage: 'Name',
          }
        ),
        sortable: true,
        truncateText: false,
        render: name => {
          return (
            <EuiLink
              onClick={() => {
                trackUiMetric(METRIC_TYPE.CLICK, UIM_FOLLOWER_INDEX_SHOW_DETAILS_CLICK);
                selectFollowerIndex(name);
              }}
              data-test-subj="followerIndexLink"
            >
              {name}
            </EuiLink>
          );
        },
      },
      {
        field: 'isPaused',
        name: i18n.translate(
          'xpack.crossClusterReplication.followerIndexList.table.statusColumnTitle',
          {
            defaultMessage: 'Status',
          }
        ),
        truncateText: true,
        sortable: true,
        render: isPaused => {
          return isPaused ? (
            <EuiHealth color="subdued">
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexList.table.statusColumn.pausedLabel"
                defaultMessage="Paused"
              />
            </EuiHealth>
          ) : (
            <EuiHealth color="success">
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexList.table.statusColumn.activeLabel"
                defaultMessage="Active"
              />
            </EuiHealth>
          );
        },
      },
      {
        field: 'remoteCluster',
        name: i18n.translate(
          'xpack.crossClusterReplication.followerIndexList.table.clusterColumnTitle',
          {
            defaultMessage: 'Remote cluster',
          }
        ),
        truncateText: true,
        sortable: true,
      },
      {
        field: 'leaderIndex',
        name: i18n.translate(
          'xpack.crossClusterReplication.followerIndexList.table.leaderIndexColumnTitle',
          {
            defaultMessage: 'Leader index',
          }
        ),
        truncateText: true,
        sortable: true,
      },
      {
        name: i18n.translate(
          'xpack.crossClusterReplication.followerIndexList.table.actionsColumnTitle',
          {
            defaultMessage: 'Actions',
          }
        ),
        actions,
        width: '100px',
      },
    ];
  }

  renderLoading = () => {
    const { apiStatusDelete } = this.props;

    if (apiStatusDelete === API_STATUS.DELETING) {
      return (
        <EuiOverlayMask>
          <EuiLoadingKibana size="xl" />
        </EuiOverlayMask>
      );
    }
    return null;
  };

  render() {
    const { selectedItems } = this.state;

    const sorting = {
      sort: {
        field: 'name',
        direction: 'asc',
      },
    };

    const pagination = {
      initialPageSize: 20,
      pageSizeOptions: [10, 20, 50],
    };

    const selection = {
      onSelectionChange: selectedItems => this.setState({ selectedItems }),
    };

    const search = {
      toolsLeft: selectedItems.length ? (
        <ContextMenu followerIndices={selectedItems} testSubj="contextMenuButton" />
      ) : (
        undefined
      ),
      onChange: this.onSearch,
      box: {
        incremental: true,
      },
    };

    return (
      <Fragment>
        <EuiInMemoryTable
          items={this.getFilteredIndices()}
          itemId="name"
          columns={this.getTableColumns()}
          search={search}
          pagination={pagination}
          sorting={sorting}
          selection={selection}
          isSelectable={true}
          rowProps={() => ({
            'data-test-subj': 'row',
          })}
          cellProps={(item, column) => ({
            'data-test-subj': `cell-${column.field}`,
          })}
          data-test-subj="followerIndexListTable"
        />
        {this.renderLoading()}
      </Fragment>
    );
  }
}
