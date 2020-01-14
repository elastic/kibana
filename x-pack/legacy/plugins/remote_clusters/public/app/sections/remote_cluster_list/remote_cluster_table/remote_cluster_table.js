/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiInMemoryTable,
  EuiLink,
  EuiToolTip,
} from '@elastic/eui';

import { CRUD_APP_BASE_PATH, UIM_SHOW_DETAILS_CLICK } from '../../../constants';
import { getRouterLinkProps, trackUiMetric, METRIC_TYPE } from '../../../services';
import { ConnectionStatus, RemoveClusterButtonProvider } from '../components';

export class RemoteClusterTable extends Component {
  static propTypes = {
    clusters: PropTypes.array,
    openDetailPanel: PropTypes.func.isRequired,
  };

  static defaultProps = {
    clusters: [],
  };

  constructor(props) {
    super(props);

    this.state = {
      queryText: undefined,
      selectedItems: [],
    };
  }

  onSearch = ({ query }) => {
    const { text } = query;
    const normalizedSearchText = text.toLowerCase();
    this.setState({
      queryText: normalizedSearchText,
    });
  };

  getFilteredClusters = () => {
    const { clusters } = this.props;
    const { queryText } = this.state;

    if (queryText) {
      return clusters.filter(cluster => {
        const { name, seeds } = cluster;
        const normalizedName = name.toLowerCase();
        if (normalizedName.toLowerCase().includes(queryText)) {
          return true;
        }

        return seeds.some(seed => seed.includes(queryText));
      });
    } else {
      return clusters.slice(0);
    }
  };

  render() {
    const { openDetailPanel } = this.props;

    const { selectedItems } = this.state;

    const columns = [
      {
        field: 'name',
        name: i18n.translate('xpack.remoteClusters.remoteClusterList.table.nameColumnTitle', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        truncateText: false,
        render: (name, { isConfiguredByNode }) => {
          const link = (
            <EuiLink
              data-test-subj="remoteClustersTableListClusterLink"
              onClick={() => {
                trackUiMetric(METRIC_TYPE.CLICK, UIM_SHOW_DETAILS_CLICK);
                openDetailPanel(name);
              }}
            >
              {name}
            </EuiLink>
          );

          if (isConfiguredByNode) {
            return (
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>{link}</EuiFlexItem>

                <EuiFlexItem
                  grow={false}
                  data-test-subj="remoteClustersTableListClusterDefinedByNodeTooltip"
                >
                  <EuiIconTip
                    type="iInCircle"
                    color="subdued"
                    content={
                      <FormattedMessage
                        id="xpack.remoteClusters.remoteClusterList.table.isConfiguredByNodeMessage"
                        defaultMessage="Defined in elasticsearch.yml"
                      />
                    }
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            );
          }

          return link;
        },
      },
      {
        field: 'seeds',
        name: i18n.translate('xpack.remoteClusters.remoteClusterList.table.seedsColumnTitle', {
          defaultMessage: 'Seeds',
        }),
        truncateText: true,
        render: seeds => seeds.join(', '),
      },
      {
        field: 'isConnected',
        name: i18n.translate('xpack.remoteClusters.remoteClusterList.table.connectedColumnTitle', {
          defaultMessage: 'Connection',
        }),
        sortable: true,
        render: isConnected => <ConnectionStatus isConnected={isConnected} />,
        width: '240px',
      },
      {
        field: 'connectedNodesCount',
        name: i18n.translate(
          'xpack.remoteClusters.remoteClusterList.table.connectedNodesColumnTitle',
          {
            defaultMessage: 'Connected nodes',
          }
        ),
        sortable: true,
        width: '160px',
      },
      {
        name: i18n.translate('xpack.remoteClusters.remoteClusterList.table.actionsColumnTitle', {
          defaultMessage: 'Actions',
        }),
        width: '100px',
        actions: [
          {
            render: ({ name, isConfiguredByNode }) => {
              const label = isConfiguredByNode
                ? i18n.translate(
                    'xpack.remoteClusters.remoteClusterList.table.actionBlockedEditDescription',
                    {
                      defaultMessage: `Remote clusters defined in elasticsearch.yml can't be edited`,
                    }
                  )
                : i18n.translate(
                    'xpack.remoteClusters.remoteClusterList.table.actionEditDescription',
                    {
                      defaultMessage: 'Edit remote cluster',
                    }
                  );

              return (
                <EuiToolTip content={label} delay="long">
                  <EuiButtonIcon
                    data-test-subj="remoteClusterTableRowEditButton"
                    aria-label={label}
                    iconType="pencil"
                    color="primary"
                    isDisabled={isConfiguredByNode}
                    {...getRouterLinkProps(`${CRUD_APP_BASE_PATH}/edit/${name}`)}
                    disabled={isConfiguredByNode}
                  />
                </EuiToolTip>
              );
            },
          },
          {
            render: ({ name, isConfiguredByNode }) => {
              const label = isConfiguredByNode
                ? i18n.translate(
                    'xpack.remoteClusters.remoteClusterList.table.actionBlockedDeleteDescription',
                    {
                      defaultMessage: `Remote clusters defined in elasticsearch.yml can't be deleted`,
                    }
                  )
                : i18n.translate(
                    'xpack.remoteClusters.remoteClusterList.table.actionDeleteDescription',
                    {
                      defaultMessage: 'Delete remote cluster',
                    }
                  );

              return (
                <EuiToolTip content={label} delay="long">
                  <RemoveClusterButtonProvider clusterNames={[name]}>
                    {removeCluster => (
                      <EuiButtonIcon
                        data-test-subj="remoteClusterTableRowRemoveButton"
                        aria-label={label}
                        iconType="trash"
                        color="danger"
                        isDisabled={isConfiguredByNode}
                        onClick={removeCluster}
                      />
                    )}
                  </RemoveClusterButtonProvider>
                </EuiToolTip>
              );
            },
          },
        ],
      },
    ];

    const sorting = {
      sort: {
        field: 'name',
        direction: 'asc',
      },
    };

    const search = {
      toolsLeft: selectedItems.length ? (
        <RemoveClusterButtonProvider clusterNames={selectedItems.map(({ name }) => name)}>
          {removeCluster => (
            <EuiButton
              color="danger"
              onClick={removeCluster}
              data-test-subj="remoteClusterBulkDeleteButton"
            >
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterList.table.removeButtonLabel"
                defaultMessage="Remove {count, plural, one {remote cluster} other {{count} remote clusters}}"
                values={{
                  count: selectedItems.length,
                }}
              />
            </EuiButton>
          )}
        </RemoveClusterButtonProvider>
      ) : (
        undefined
      ),
      onChange: this.onSearch,
      box: {
        incremental: true,
      },
    };

    const pagination = {
      initialPageSize: 20,
      pageSizeOptions: [10, 20, 50],
    };

    const selection = {
      onSelectionChange: selectedItems => this.setState({ selectedItems }),
      selectable: ({ isConfiguredByNode }) => !isConfiguredByNode,
    };

    const filteredClusters = this.getFilteredClusters();

    return (
      <EuiInMemoryTable
        items={filteredClusters}
        itemId="name"
        columns={columns}
        search={search}
        pagination={pagination}
        sorting={sorting}
        selection={selection}
        isSelectable={true}
        data-test-subj="remoteClusterListTable"
      />
    );
  }
}
