/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  CriteriaWithPagination,
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { Meta } from '@kbn/search-connectors';
import { CONNECTOR_DETAIL_PATH, SEARCH_INDEX_PATH } from '../routes';
import {
  connectorStatusToColor,
  connectorStatusToText,
} from '../../utils/connector_status_helpers';

import { ConnectorViewIndexLink } from '../shared/connector_view_search_indices_details/connector_view_search_indices_details';

import { ConnectorType } from './connector_type';
import { ConnectorViewItem } from './connectors_logic';
import { generateEncodedPath } from '../shared/encode_path_params';
import { EuiLinkTo } from '../shared/react_router_helpers';

interface ConnectorsTableProps {
  isCrawler: boolean;
  isLoading?: boolean;
  items: ConnectorViewItem[];
  meta?: Meta;
  onChange: (criteria: CriteriaWithPagination<ConnectorViewItem>) => void;
  onDelete: (connectorName: string, connectorId: string, indexName: string | null) => void;
}
export const ConnectorsTable: React.FC<ConnectorsTableProps> = ({
  items,
  meta = {
    page: {
      from: 0,
      size: 10,
      total: 0,
    },
  },
  onChange,
  isCrawler,
  isLoading,
  onDelete,
}) => {
  const {
    services: { application },
  } = useKibana();

  const columns: Array<EuiBasicTableColumn<ConnectorViewItem>> = [
    ...(!isCrawler
      ? [
          {
            name: i18n.translate(
              'xpack.contentConnectors.content.connectors.connectorTable.columns.connectorName',
              {
                defaultMessage: 'Connector name',
              }
            ),
            render: (connector: ConnectorViewItem) => (
              <EuiLinkTo
                to={generateEncodedPath(CONNECTOR_DETAIL_PATH, { connectorId: connector.id })}
              >
                {connector.name}
              </EuiLinkTo>
            ),
            width: '25%',
          },
        ]
      : []),
    {
      name: i18n.translate(
        'xpack.contentConnectors.content.connectors.connectorTable.columns.indexName',
        {
          defaultMessage: 'Index name',
        }
      ),
      render: (connector: ConnectorViewItem) =>
        connector.index_name ? (
          connector.indexExists ? (
            <ConnectorViewIndexLink indexName={connector.index_name} />
          ) : (
            connector.index_name
          )
        ) : (
          '--'
        ),
      width: isCrawler ? '70%' : '25%',
    },
    {
      field: 'docsCount',
      name: i18n.translate(
        'xpack.contentConnectors.content.connectors.connectorTable.columns.docsCount',
        {
          defaultMessage: 'Docs count',
        }
      ),
      truncateText: true,
    },
    ...(!isCrawler
      ? [
          {
            field: 'service_type',
            name: i18n.translate(
              'xpack.contentConnectors.content.connectors.connectorTable.columns.type',
              {
                defaultMessage: 'Connector type',
              }
            ),
            render: (serviceType: string) => <ConnectorType serviceType={serviceType} />,
            truncateText: true,
            width: '15%',
          },
        ]
      : []),
    {
      name: i18n.translate(
        'xpack.contentConnectors.content.connectors.connectorTable.columns.status',
        {
          defaultMessage: 'Ingestion status',
        }
      ),
      render: (connector: ConnectorViewItem) => {
        const label = connectorStatusToText(connector);
        return <EuiBadge color={connectorStatusToColor(connector)}>{label}</EuiBadge>;
      },
      truncateText: true,
      width: '15%',
    },
    {
      actions: [
        {
          description: 'Delete this connector',
          icon: 'trash',
          isPrimary: false,
          name: (connector) =>
            i18n.translate(
              'xpack.contentConnectors.content.connectors.connectorTable.column.actions.deleteIndex',
              {
                defaultMessage: 'Delete connector {connectorName}',
                values: { connectorName: connector.name },
              }
            ),
          onClick: (connector) => {
            onDelete(connector.name, connector.id, connector.index_name);
          },
          type: 'icon',
        },
        {
          description: isCrawler
            ? i18n.translate(
                'xpack.contentConnectors.content.connectors.connectorTable.columns.actions.viewCrawler',
                { defaultMessage: 'View this crawler' }
              )
            : i18n.translate(
                'xpack.contentConnectors.content.connectors.connectorTable.columns.actions.viewIndex',
                { defaultMessage: 'View this connector' }
              ),
          enabled: (connector) => !!connector.index_name,
          icon: 'eye',
          isPrimary: false,
          name: (connector) =>
            i18n.translate(
              'xpack.contentConnectors.content.connectors.connectorsTable.columns.actions.viewIndex.caption',
              {
                defaultMessage: 'View index {connectorName}',
                values: {
                  connectorName: connector.name,
                },
              }
            ),
          onClick: (connector) => {
            if (isCrawler) {
              // crawler always has an index this is to satisfy TS
              if (connector.index_name) {
                application?.navigateToUrl(
                  generateEncodedPath(
                    `/app/management/data/content_connectors${SEARCH_INDEX_PATH}`,
                    {
                      indexName: connector.index_name,
                    }
                  )
                );
              }
            } else {
              application?.navigateToUrl(
                generateEncodedPath(
                  `/app/management/data/content_connectors${CONNECTOR_DETAIL_PATH}`,
                  {
                    connectorId: connector.id,
                  }
                )
              );
            }
          },
          type: 'icon',
        },
      ],
      name: i18n.translate(
        'xpack.contentConnectors.content.connectors.connectorTable.columns.actions',
        {
          defaultMessage: 'Actions',
        }
      ),
    },
  ];

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiBasicTable
          items={items}
          columns={columns}
          onChange={onChange}
          tableLayout="fixed"
          tableCaption={i18n.translate(
            'xpack.contentConnectorsTable.table.availableConnectorsTableCaption',
            { defaultMessage: 'Available connectors table' }
          )}
          loading={isLoading}
          noItemsMessage={
            <EuiText aria-live="polite" size="s">
              {i18n.translate('xpack.contentConnectorsTable.table.noResultsMessage', {
                defaultMessage: 'No connectors found',
              })}
            </EuiText>
          }
          pagination={{
            pageIndex: meta.page.from / (meta.page.size || 1),
            pageSize: meta.page.size,
            showPerPageOptions: false,
            totalItemCount: meta.page.total,
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
