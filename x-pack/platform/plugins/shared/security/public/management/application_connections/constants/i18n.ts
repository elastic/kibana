/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const labels = {
  page: {
    title: i18n.translate('xpack.security.management.applicationConnectionsTitle', {
      defaultMessage: 'Application connections',
    }),
    pageCallout: i18n.translate('xpack.security.management.applicationConnectionsPageCallout', {
      defaultMessage:
        'Manage connections for OAuth-based applications. Currently, only MCP clients are supported.',
    }),
    manageClientsLink: i18n.translate(
      'xpack.security.management.applicationConnections.manageClientsLink',
      { defaultMessage: 'Manage MCP clients' }
    ),
  },
  search: {
    placeholder: i18n.translate(
      'xpack.security.management.applicationConnections.searchPlaceholder',
      { defaultMessage: 'Search' }
    ),
    ariaLabel: i18n.translate('xpack.security.management.applicationConnections.searchAriaLabel', {
      defaultMessage: 'Search by application or connection name',
    }),
  },
  filters: {
    statusLabel: i18n.translate(
      'xpack.security.management.applicationConnections.filters.statusLabel',
      { defaultMessage: 'Status' }
    ),
    statusConnected: i18n.translate(
      'xpack.security.management.applicationConnections.filters.statusConnected',
      { defaultMessage: 'Connected' }
    ),
    statusExpired: i18n.translate(
      'xpack.security.management.applicationConnections.filters.statusExpired',
      { defaultMessage: 'Expired' }
    ),
    statusRevoked: i18n.translate(
      'xpack.security.management.applicationConnections.filters.statusRevoked',
      { defaultMessage: 'Revoked' }
    ),
  },
  viewMode: {
    legend: i18n.translate(
      'xpack.security.management.applicationConnections.viewModeToggle.legend',
      { defaultMessage: 'Switch between grouped and flat list views' }
    ),
    grouped: i18n.translate(
      'xpack.security.management.applicationConnections.viewModeToggle.groupByClient',
      { defaultMessage: 'Group by client' }
    ),
    list: i18n.translate(
      'xpack.security.management.applicationConnections.viewModeToggle.listView',
      { defaultMessage: 'List view' }
    ),
  },
  status: {
    connected: i18n.translate('xpack.security.management.applicationConnections.status.connected', {
      defaultMessage: 'Connected',
    }),
    connectedTooltip: i18n.translate(
      'xpack.security.management.applicationConnections.status.connectedTooltip',
      {
        defaultMessage:
          'This connection is authorized. Sessions expire after 30 days of inactivity.',
      }
    ),
    expired: i18n.translate('xpack.security.management.applicationConnections.status.expired', {
      defaultMessage: 'Expired',
    }),
    revoked: i18n.translate('xpack.security.management.applicationConnections.status.revoked', {
      defaultMessage: 'Revoked',
    }),
  },
  groupedColumns: {
    clientName: i18n.translate(
      'xpack.security.management.applicationConnections.columns.clientName',
      { defaultMessage: 'Client name' }
    ),
    connections: i18n.translate(
      'xpack.security.management.applicationConnections.columns.connections',
      { defaultMessage: 'Connections' }
    ),
    expandRowAriaLabel: i18n.translate(
      'xpack.security.management.applicationConnections.expandRowAriaLabel',
      { defaultMessage: 'Expand application' }
    ),
    collapseRowAriaLabel: i18n.translate(
      'xpack.security.management.applicationConnections.collapseRowAriaLabel',
      { defaultMessage: 'Collapse application' }
    ),
    selectClientLabel: (name: string) =>
      i18n.translate('xpack.security.management.applicationConnections.columns.selectClientLabel', {
        defaultMessage: "Select all connections for client ''{name}''",
        values: { name },
      }),
    allRevokedClientLabel: i18n.translate(
      'xpack.security.management.applicationConnections.columns.allRevokedClientLabel',
      { defaultMessage: 'All connections for this client are already revoked' }
    ),
    noRevokedConnectionsClientLabel: i18n.translate(
      'xpack.security.management.applicationConnections.columns.noRevokedConnectionsClientLabel',
      { defaultMessage: 'This client has no revoked connections to delete' }
    ),
    noConnectionsClientLabel: i18n.translate(
      'xpack.security.management.applicationConnections.columns.noConnectionsClientLabel',
      { defaultMessage: 'This client has no connections yet' }
    ),
  },
  connectionColumns: {
    connectionName: i18n.translate(
      'xpack.security.management.applicationConnections.connectionColumns.connectionName',
      { defaultMessage: 'Connection name' }
    ),
    clientName: i18n.translate(
      'xpack.security.management.applicationConnections.connectionColumns.clientName',
      { defaultMessage: 'Client name' }
    ),
    authorizationDate: i18n.translate(
      'xpack.security.management.applicationConnections.connectionColumns.authorizationDate',
      { defaultMessage: 'Authorization date' }
    ),
    connectedBy: i18n.translate(
      'xpack.security.management.applicationConnections.connectionColumns.connectedBy',
      { defaultMessage: 'Connected by' }
    ),
    status: i18n.translate(
      'xpack.security.management.applicationConnections.connectionColumns.status',
      { defaultMessage: 'Status' }
    ),
    actions: i18n.translate(
      'xpack.security.management.applicationConnections.connectionColumns.actions',
      { defaultMessage: 'Actions' }
    ),
    revokeLabel: i18n.translate(
      'xpack.security.management.applicationConnections.connectionColumns.revokeLabel',
      { defaultMessage: 'Revoke' }
    ),
    deleteLabel: i18n.translate(
      'xpack.security.management.applicationConnections.connectionColumns.deleteLabel',
      { defaultMessage: 'Delete' }
    ),
    selectRowLabel: (name: string) =>
      i18n.translate(
        'xpack.security.management.applicationConnections.connectionColumns.selectRowLabel',
        {
          defaultMessage: "Select connection ''{name}''",
          values: { name },
        }
      ),
    deletableRowNotSelectableLabel: i18n.translate(
      'xpack.security.management.applicationConnections.connectionColumns.deletableRowNotSelectableLabel',
      {
        defaultMessage:
          'This connection is already revoked. Clear your selection to delete it instead.',
      }
    ),
    revocableRowNotSelectableLabel: i18n.translate(
      'xpack.security.management.applicationConnections.connectionColumns.revocableRowNotSelectableLabel',
      {
        defaultMessage:
          'Only revoked connections can be deleted. Clear your selection to revoke this one instead.',
      }
    ),
  },
  childTable: {
    tableCaption: i18n.translate(
      'xpack.security.management.applicationConnections.childTable.tableCaption',
      { defaultMessage: 'List of connections for client' }
    ),
  },
  groupedTable: {
    tableCaption: i18n.translate('xpack.security.management.applicationConnections.tableCaption', {
      defaultMessage: 'List of applications with OAuth connections',
    }),
    noMatchesMessage: i18n.translate(
      'xpack.security.management.applicationConnections.noMatchesMessage',
      { defaultMessage: 'No applications match the current filters.' }
    ),
    applicationsLabel: i18n.translate(
      'xpack.security.management.applicationConnections.applicationsLabel',
      { defaultMessage: 'MCP clients' }
    ),
  },
  listTable: {
    tableCaption: i18n.translate(
      'xpack.security.management.applicationConnections.list.tableCaption',
      { defaultMessage: 'Flat list of OAuth connections' }
    ),
    noMatchesMessage: i18n.translate(
      'xpack.security.management.applicationConnections.list.noMatchesMessage',
      { defaultMessage: 'No connections match the current filters.' }
    ),
    connectionsLabel: i18n.translate(
      'xpack.security.management.applicationConnections.connectionsLabel',
      { defaultMessage: 'Application connections' }
    ),
  },
  bulkRevokeButton: (count: number) =>
    i18n.translate('xpack.security.management.applicationConnections.bulkRevokeButton', {
      defaultMessage: 'Revoke {count, plural, one {# connection} other {# connections}}',
      values: { count },
    }),
  bulkDeleteButton: (count: number) =>
    i18n.translate('xpack.security.management.applicationConnections.bulkDeleteButton', {
      defaultMessage: 'Delete {count, plural, one {# connection} other {# connections}}',
      values: { count },
    }),
  emptyPrompt: {
    title: i18n.translate(
      'xpack.security.management.applicationConnectionsEmptyPrompt.emptyTitle',
      { defaultMessage: 'No application connections' }
    ),
    message: i18n.translate(
      'xpack.security.management.applicationConnectionsEmptyPrompt.emptyMessage',
      { defaultMessage: 'Get started by creating MCP clients (OAuth).' }
    ),
    addButton: i18n.translate(
      'xpack.security.management.applicationConnectionsEmptyPrompt.addButton',
      { defaultMessage: 'Create MCP client (OAuth)' }
    ),
    learnMoreLink: i18n.translate(
      'xpack.security.management.applicationConnectionsEmptyPrompt.learnMoreLink',
      { defaultMessage: 'Learn more' }
    ),
  },
  viewClientDetails: {
    linkAriaLabel: (name: string) =>
      i18n.translate(
        'xpack.security.management.applicationConnections.viewClientDetails.linkAriaLabel',
        {
          defaultMessage: "View ''{name}'' details",
          values: { name },
        }
      ),
  },
  update: {
    editAriaLabel: (name: string) =>
      i18n.translate('xpack.security.management.applicationConnections.update.editAriaLabel', {
        defaultMessage: "Edit connection name for ''{name}''",
        values: { name },
      }),
    inputAriaLabel: i18n.translate(
      'xpack.security.management.applicationConnections.update.inputAriaLabel',
      { defaultMessage: 'Connection name' }
    ),
    emptyValidationError: i18n.translate(
      'xpack.security.management.applicationConnections.update.emptyValidationError',
      { defaultMessage: 'Connection name cannot be empty.' }
    ),
    tooLongValidationError: (maxLength: number) =>
      i18n.translate(
        'xpack.security.management.applicationConnections.update.tooLongValidationError',
        {
          defaultMessage: 'Connection name must be {maxLength} characters or fewer.',
          values: { maxLength },
        }
      ),
    successToast: (name: string) =>
      i18n.translate('xpack.security.management.applicationConnections.update.successToast', {
        defaultMessage: "Renamed connection to ''{name}''",
        values: { name },
      }),
    errorToastTitle: i18n.translate(
      'xpack.security.management.applicationConnections.update.errorToastTitle',
      { defaultMessage: 'Could not rename connection' }
    ),
  },
  revoke: {
    title: (count: number) =>
      i18n.translate('xpack.security.management.applicationConnections.revoke.title', {
        defaultMessage: 'Revoke {count, plural, one {connection} other {connections}}?',
        values: { count },
      }),
    intro: i18n.translate('xpack.security.management.applicationConnections.revoke.intro', {
      defaultMessage: 'Connections to revoke:',
    }),
    tableCaption: i18n.translate(
      'xpack.security.management.applicationConnections.revoke.tableCaption',
      { defaultMessage: 'Connections to revoke' }
    ),
    connectionNameColumn: i18n.translate(
      'xpack.security.management.applicationConnections.revoke.connectionNameColumn',
      { defaultMessage: 'Connection name' }
    ),
    clientNameColumn: i18n.translate(
      'xpack.security.management.applicationConnections.revoke.clientNameColumn',
      { defaultMessage: 'Client name' }
    ),
    connectedByColumn: i18n.translate(
      'xpack.security.management.applicationConnections.revoke.connectedByColumn',
      { defaultMessage: 'Connected by' }
    ),
    calloutTitle: () =>
      i18n.translate('xpack.security.management.applicationConnections.revoke.calloutTitle', {
        defaultMessage:
          'Revoking removes these connections only. The client stays registered and can accept new connections.',
      }),
    note: i18n.translate('xpack.security.management.applicationConnections.revoke.note', {
      defaultMessage: 'Applications can be reconnected at any time.',
    }),
    cancelButton: i18n.translate(
      'xpack.security.management.applicationConnections.revoke.cancelButton',
      { defaultMessage: 'Cancel' }
    ),
    confirmButton: i18n.translate(
      'xpack.security.management.applicationConnections.revoke.confirmButton',
      { defaultMessage: 'Revoke' }
    ),
    successToast: (count: number) =>
      i18n.translate('xpack.security.management.applicationConnections.revoke.successToast', {
        defaultMessage: 'Revoked {count, plural, one {# connection} other {# connections}}',
        values: { count },
      }),
    allFailedToast: (count: number) =>
      i18n.translate('xpack.security.management.applicationConnections.revoke.allFailedToast', {
        defaultMessage: 'Could not revoke {count, plural, one {connection} other {connections}}',
        values: { count },
      }),
    partialFailedToast: (succeeded: number, total: number) =>
      i18n.translate('xpack.security.management.applicationConnections.revoke.partialFailedToast', {
        defaultMessage:
          'Revoked {succeeded} of {total} {total, plural, one {connection} other {connections}}',
        values: { succeeded, total },
      }),
    unexpectedErrorToast: i18n.translate(
      'xpack.security.management.applicationConnections.revoke.unexpectedErrorToast',
      { defaultMessage: 'Could not revoke connections' }
    ),
  },
  delete: {
    title: (count: number) =>
      i18n.translate('xpack.security.management.applicationConnections.delete.title', {
        defaultMessage: 'Permanently delete {count, plural, one {connection} other {connections}}?',
        values: { count },
      }),
    intro: i18n.translate('xpack.security.management.applicationConnections.delete.intro', {
      defaultMessage: 'Connections to delete:',
    }),
    tableCaption: i18n.translate(
      'xpack.security.management.applicationConnections.delete.tableCaption',
      { defaultMessage: 'Connections to delete' }
    ),
    connectionNameColumn: i18n.translate(
      'xpack.security.management.applicationConnections.delete.connectionNameColumn',
      { defaultMessage: 'Connection name' }
    ),
    clientNameColumn: i18n.translate(
      'xpack.security.management.applicationConnections.delete.clientNameColumn',
      { defaultMessage: 'Client name' }
    ),
    connectedByColumn: i18n.translate(
      'xpack.security.management.applicationConnections.delete.connectedByColumn',
      { defaultMessage: 'Connected by' }
    ),
    calloutTitle: (count: number) =>
      i18n.translate('xpack.security.management.applicationConnections.delete.calloutTitle', {
        defaultMessage:
          '{count, plural, one {This connection has} other {These connections have}} already been revoked. Deleting permanently removes {count, plural, one {it} other {them}} from your organization immediately instead of waiting for the 90-day retention period.',
        values: { count },
      }),
    note: i18n.translate('xpack.security.management.applicationConnections.delete.note', {
      defaultMessage: 'This action cannot be undone.',
    }),
    cancelButton: i18n.translate(
      'xpack.security.management.applicationConnections.delete.cancelButton',
      { defaultMessage: 'Cancel' }
    ),
    confirmButton: i18n.translate(
      'xpack.security.management.applicationConnections.delete.confirmButton',
      { defaultMessage: 'Delete permanently' }
    ),
    successToast: (count: number) =>
      i18n.translate('xpack.security.management.applicationConnections.delete.successToast', {
        defaultMessage: 'Deleted {count, plural, one {# connection} other {# connections}}',
        values: { count },
      }),
    allFailedToast: (count: number) =>
      i18n.translate('xpack.security.management.applicationConnections.delete.allFailedToast', {
        defaultMessage: 'Could not delete {count, plural, one {connection} other {connections}}',
        values: { count },
      }),
    partialFailedToast: (succeeded: number, total: number) =>
      i18n.translate('xpack.security.management.applicationConnections.delete.partialFailedToast', {
        defaultMessage:
          'Deleted {succeeded} of {total} {total, plural, one {connection} other {connections}}',
        values: { succeeded, total },
      }),
    unexpectedErrorToast: i18n.translate(
      'xpack.security.management.applicationConnections.delete.unexpectedErrorToast',
      { defaultMessage: 'Could not delete connections' }
    ),
  },
};
