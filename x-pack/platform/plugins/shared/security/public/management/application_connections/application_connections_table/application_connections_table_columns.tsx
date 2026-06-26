/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiBasicTableColumn,
  EuiTableComputedColumnType,
  EuiTableFieldDataColumnType,
} from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiLink,
  EuiNotificationBadge,
  EuiText,
  EuiTextColor,
  EuiToolTip,
} from '@elastic/eui';
import React, { useMemo } from 'react';

import { labels } from '../constants/i18n';
import type { ApplicationConnections } from '../constants/types';
import { useApplicationConnectionsActions } from '../context/application_connections_provider';

export interface UseApplicationConnectionsTableColumnsOptions {
  expandedRows: ReadonlySet<string>;
  onToggleExpand: (clientId: string) => void;
}

export const useApplicationConnectionsTableColumns = ({
  expandedRows,
  onToggleExpand,
}: UseApplicationConnectionsTableColumnsOptions): Array<
  EuiBasicTableColumn<ApplicationConnections>
> => {
  const { viewClientDetails } = useApplicationConnectionsActions();

  return useMemo(() => {
    const nameColumn: EuiTableFieldDataColumnType<ApplicationConnections> = {
      field: 'client.client_name',
      name: labels.groupedColumns.clientName,
      sortable: ({ client }) => client.client_name ?? client.id,
      render: (_, applicationConnections: ApplicationConnections) => {
        const { client } = applicationConnections;
        const displayName = client.client_name ?? client.id;
        const link = (
          <EuiLink
            color={client.revoked ? 'subdued' : 'primary'}
            onClick={() => viewClientDetails(client)}
            aria-label={labels.viewClientDetails.linkAriaLabel(displayName)}
            data-test-subj={`viewClientDetailsLink-${client.id}`}
          >
            {displayName}
          </EuiLink>
        );
        return (
          <EuiText size="s" data-test-subj={`applicationRow-${client.id}`}>
            {client.revoked ? <EuiTextColor color="subdued">{link}</EuiTextColor> : link}
          </EuiText>
        );
      },
    };

    const connectionsColumn: EuiTableComputedColumnType<ApplicationConnections> = {
      name: labels.groupedColumns.connections,
      sortable: ({ connections }) => connections.length,
      render: ({ client, connections }) => (
        <EuiNotificationBadge
          color="subdued"
          size="m"
          data-test-subj={`applicationConnectionsCount-${client.id}`}
        >
          {connections.length}
        </EuiNotificationBadge>
      ),
    };

    const expandColumn: EuiTableComputedColumnType<ApplicationConnections> = {
      width: '40px',
      align: 'right',
      isExpander: true,
      render: ({ client, connections }) => {
        if (connections.length === 0) return null;
        const isOpen = expandedRows.has(client.id);
        return (
          <EuiToolTip
            content={
              isOpen
                ? labels.groupedColumns.collapseRowAriaLabel
                : labels.groupedColumns.expandRowAriaLabel
            }
            disableScreenReaderOutput
          >
            <EuiButtonIcon
              data-test-subj={`expandRow-${client.id}`}
              aria-label={
                isOpen
                  ? labels.groupedColumns.collapseRowAriaLabel
                  : labels.groupedColumns.expandRowAriaLabel
              }
              iconType={isOpen ? 'arrowDown' : 'arrowRight'}
              onClick={() => onToggleExpand(client.id)}
            />
          </EuiToolTip>
        );
      },
    };

    return [nameColumn, connectionsColumn, expandColumn];
  }, [expandedRows, onToggleExpand, viewClientDetails]);
};
