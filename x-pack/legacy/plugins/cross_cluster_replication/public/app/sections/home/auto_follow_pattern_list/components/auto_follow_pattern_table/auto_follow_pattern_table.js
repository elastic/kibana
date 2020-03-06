/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import {
  EuiInMemoryTable,
  EuiLink,
  EuiLoadingKibana,
  EuiOverlayMask,
  EuiHealth,
  EuiIcon,
} from '@elastic/eui';
import { API_STATUS, UIM_AUTO_FOLLOW_PATTERN_SHOW_DETAILS_CLICK } from '../../../../../constants';
import {
  AutoFollowPatternDeleteProvider,
  AutoFollowPatternActionMenu,
} from '../../../../../components';
import routing from '../../../../../services/routing';
import { trackUiMetric, METRIC_TYPE } from '../../../../../services/track_ui_metric';

export class AutoFollowPatternTable extends PureComponent {
  static propTypes = {
    autoFollowPatterns: PropTypes.array,
    selectAutoFollowPattern: PropTypes.func.isRequired,
    pauseAutoFollowPattern: PropTypes.func.isRequired,
    resumeAutoFollowPattern: PropTypes.func.isRequired,
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

  getFilteredPatterns = () => {
    const { autoFollowPatterns } = this.props;
    const { queryText } = this.state;

    if (queryText) {
      return autoFollowPatterns.filter(autoFollowPattern => {
        const {
          name,
          remoteCluster,
          followIndexPatternPrefix,
          followIndexPatternSuffix,
        } = autoFollowPattern;

        const inName = name.toLowerCase().includes(queryText);
        const inRemoteCluster = remoteCluster.toLowerCase().includes(queryText);
        const inPrefix = followIndexPatternPrefix.toLowerCase().includes(queryText);
        const inSuffix = followIndexPatternSuffix.toLowerCase().includes(queryText);

        return inName || inRemoteCluster || inPrefix || inSuffix;
      });
    }

    return autoFollowPatterns.slice(0);
  };

  getTableColumns() {
    const { selectAutoFollowPattern } = this.props;

    return [
      {
        field: 'name',
        name: i18n.translate(
          'xpack.crossClusterReplication.autoFollowPatternList.table.nameColumnTitle',
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
                trackUiMetric(METRIC_TYPE.CLICK, UIM_AUTO_FOLLOW_PATTERN_SHOW_DETAILS_CLICK);
                selectAutoFollowPattern(name);
              }}
              data-test-subj="autoFollowPatternLink"
            >
              {name}
            </EuiLink>
          );
        },
      },
      {
        field: 'active',
        dataType: 'boolean',
        name: i18n.translate(
          'xpack.crossClusterReplication.autoFollowPatternList.table.statusTitle',
          {
            defaultMessage: 'Status',
          }
        ),
        render: active => {
          const statusText = active
            ? i18n.translate(
                'xpack.crossClusterReplication.autoFollowPatternList.table.statusTextActive',
                { defaultMessage: 'Active' }
              )
            : i18n.translate(
                'xpack.crossClusterReplication.autoFollowPatternList.table.statusTextPaused',
                { defaultMessage: 'Paused' }
              );

          return (
            <>
              <EuiHealth color={active ? 'success' : 'subdued'} />
              &nbsp;{statusText}
            </>
          );
        },
        sortable: true,
      },
      {
        field: 'remoteCluster',
        name: i18n.translate(
          'xpack.crossClusterReplication.autoFollowPatternList.table.clusterColumnTitle',
          {
            defaultMessage: 'Remote cluster',
          }
        ),
        truncateText: true,
        sortable: true,
      },
      {
        field: 'leaderIndexPatterns',
        name: i18n.translate(
          'xpack.crossClusterReplication.autoFollowPatternList.table.leaderPatternsColumnTitle',
          {
            defaultMessage: 'Leader patterns',
          }
        ),
        render: leaderPatterns => leaderPatterns.join(', '),
      },
      {
        field: 'followIndexPatternPrefix',
        name: i18n.translate(
          'xpack.crossClusterReplication.autoFollowPatternList.table.prefixColumnTitle',
          {
            defaultMessage: 'Follower index prefix',
          }
        ),
        sortable: true,
      },
      {
        field: 'followIndexPatternSuffix',
        name: i18n.translate(
          'xpack.crossClusterReplication.autoFollowPatternList.table.suffixColumnTitle',
          {
            defaultMessage: 'Follower index suffix',
          }
        ),
        sortable: true,
      },
      {
        name: i18n.translate(
          'xpack.crossClusterReplication.autoFollowPatternList.table.actionsColumnTitle',
          {
            defaultMessage: 'Actions',
          }
        ),
        actions: [
          {
            render: ({ name, active }) => {
              const label = active
                ? i18n.translate(
                    'xpack.crossClusterReplication.autoFollowPatternList.table.actionPauseDescription',
                    {
                      defaultMessage: 'Pause replication',
                    }
                  )
                : i18n.translate(
                    'xpack.crossClusterReplication.autoFollowPatternList.table.actionResumeDescription',
                    {
                      defaultMessage: 'Resume replication',
                    }
                  );

              return (
                <span
                  onClick={event => {
                    if (event.stopPropagation) {
                      event.stopPropagation();
                    }
                    if (active) {
                      this.props.pauseAutoFollowPattern(name);
                    } else {
                      this.props.resumeAutoFollowPattern(name);
                    }
                  }}
                  data-test-subj={active ? 'contextMenuPauseButton' : 'contextMenuResumeButton'}
                >
                  <EuiIcon
                    aria-label={label}
                    type={active ? 'pause' : 'play'}
                    className="euiContextMenu__icon"
                  />
                  <span>{label}</span>
                </span>
              );
            },
          },
          {
            render: ({ name }) => {
              const label = i18n.translate(
                'xpack.crossClusterReplication.autoFollowPatternList.table.actionEditDescription',
                {
                  defaultMessage: 'Edit auto-follow pattern',
                }
              );

              return (
                <span
                  onClick={() => (window.location.hash = routing.getAutoFollowPatternPath(name))}
                  data-test-subj="contextMenuEditButton"
                >
                  <EuiIcon aria-label={label} type="pencil" className="euiContextMenu__icon" />
                  <span>{label}</span>
                </span>
              );
            },
          },
          {
            render: ({ name }) => {
              const label = i18n.translate(
                'xpack.crossClusterReplication.autoFollowPatternList.table.actionDeleteDescription',
                {
                  defaultMessage: 'Delete auto-follow pattern',
                }
              );

              return (
                <AutoFollowPatternDeleteProvider>
                  {deleteAutoFollowPattern => (
                    <span
                      onClick={() => deleteAutoFollowPattern(name)}
                      data-test-subj="contextMenuDeleteButton"
                    >
                      <EuiIcon aria-label={label} type="trash" className="euiContextMenu__icon" />
                      <span>{label}</span>
                    </span>
                  )}
                </AutoFollowPatternDeleteProvider>
              );
            },
          },
        ],
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
      onSelectionChange: selectedItems =>
        this.setState({ selectedItems: selectedItems.map(({ name }) => name) }),
    };

    const items = this.getFilteredPatterns();

    const search = {
      toolsLeft: selectedItems.length ? (
        <AutoFollowPatternActionMenu
          arrowDirection="down"
          patterns={this.state.selectedItems.map(name => items.find(item => item.name === name))}
        />
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
          items={items}
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
            'data-test-subj': `cell_${column.field}`,
          })}
          data-test-subj="autoFollowPatternListTable"
        />
        {this.renderLoading()}
      </Fragment>
    );
  }
}
