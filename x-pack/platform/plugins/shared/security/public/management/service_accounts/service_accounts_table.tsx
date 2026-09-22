/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, EuiSearchBarProps } from '@elastic/eui';
import {
  EuiAvatar,
  EuiBadge,
  EuiBadgeGroup,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import React, { useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';

import type {
  ServiceAccountDirectoryCreator,
  ServiceAccountDirectoryEntry,
} from '../../service_accounts';

export interface ServiceAccountTableItem extends ServiceAccountDirectoryEntry {
  description?: string;
  workloadCount?: number;
}

export interface ServiceAccountsTableProps {
  serviceAccounts: ServiceAccountTableItem[];
  canDelete: boolean;
  onOpenAccount: (serviceAccount: ServiceAccountTableItem) => void;
  onOpenWorkloads: (serviceAccount: ServiceAccountTableItem) => void;
  onDeleteAccount: (serviceAccount: ServiceAccountTableItem) => void;
}

const unavailableValue = (
  <EuiText color="subdued" size="s">
    &mdash;
  </EuiText>
);

const getCreatorLabel = (creator?: ServiceAccountDirectoryCreator) => {
  if (!creator) {
    return i18n.translate('xpack.security.management.serviceAccounts.table.createdByUnavailable', {
      defaultMessage: 'Unknown',
    });
  }

  if (creator.displayName) {
    return creator.displayName;
  }

  switch (creator.type) {
    case 'user':
      return creator.username;
    case 'api_key':
      return i18n.translate('xpack.security.management.serviceAccounts.table.createdByApiKey', {
        defaultMessage: 'API key {apiKeyId}',
        values: { apiKeyId: creator.apiKeyId },
      });
    case 'service_account':
      return creator.serviceAccountId;
  }
};

export const ServiceAccountsTable = ({
  serviceAccounts,
  canDelete,
  onOpenAccount,
  onOpenWorkloads,
  onDeleteAccount,
}: ServiceAccountsTableProps) => {
  const [, setSelection] = useState<ServiceAccountTableItem[]>([]);

  const roleOptions = useMemo(
    () =>
      Array.from(new Set(serviceAccounts.flatMap(({ roles }) => roles)))
        .sort((first, second) => first.localeCompare(second))
        .map((role) => ({ value: role, name: role })),
    [serviceAccounts]
  );

  const search = useMemo<EuiSearchBarProps>(
    () => ({
      box: {
        incremental: true,
        placeholder: i18n.translate(
          'xpack.security.management.serviceAccounts.table.searchPlaceholder',
          { defaultMessage: 'Search service accounts' }
        ),
        'aria-label': i18n.translate(
          'xpack.security.management.serviceAccounts.table.searchAriaLabel',
          { defaultMessage: 'Search service accounts' }
        ),
        'data-test-subj': 'serviceAccountsSearch',
      },
      filters:
        roleOptions.length > 0
          ? [
              {
                type: 'field_value_selection',
                field: 'roles',
                name: i18n.translate('xpack.security.management.serviceAccounts.table.roleFilter', {
                  defaultMessage: 'Role',
                }),
                multiSelect: 'or',
                options: roleOptions,
              },
            ]
          : undefined,
    }),
    [roleOptions]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<ServiceAccountTableItem>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.security.management.serviceAccounts.table.nameColumn', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        render: (name: string, serviceAccount) => (
          <EuiLink
            data-test-subj={`serviceAccountName-${serviceAccount.id}`}
            onClick={() => onOpenAccount(serviceAccount)}
          >
            {name}
          </EuiLink>
        ),
      },
      {
        field: 'description',
        name: i18n.translate('xpack.security.management.serviceAccounts.table.descriptionColumn', {
          defaultMessage: 'Description',
        }),
        truncateText: true,
        render: (description?: string) => description || unavailableValue,
      },
      {
        field: 'roles',
        name: i18n.translate('xpack.security.management.serviceAccounts.table.rolesColumn', {
          defaultMessage: 'Roles',
        }),
        render: (roles: string[]) =>
          roles.length > 0 ? (
            <EuiBadgeGroup gutterSize="xs">
              {roles.map((role) => (
                <EuiBadge key={role} color="hollow" iconType="user">
                  {role}
                </EuiBadge>
              ))}
            </EuiBadgeGroup>
          ) : (
            unavailableValue
          ),
      },
      {
        field: 'createdBy',
        name: i18n.translate('xpack.security.management.serviceAccounts.table.createdByColumn', {
          defaultMessage: 'Created by',
        }),
        sortable: ({ createdBy }) => getCreatorLabel(createdBy),
        render: (creator?: ServiceAccountDirectoryCreator) => {
          const label = getCreatorLabel(creator);
          return (
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiAvatar name={label} size="s" />
              </EuiFlexItem>
              <EuiFlexItem>{label}</EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'workloadCount',
        name: i18n.translate('xpack.security.management.serviceAccounts.table.workloadsColumn', {
          defaultMessage: 'Workloads',
        }),
        render: (workloadCount: number | undefined, serviceAccount) =>
          workloadCount === undefined ? (
            <EuiToolTip
              content={i18n.translate(
                'xpack.security.management.serviceAccounts.table.workloadsUnavailable',
                { defaultMessage: 'Workload associations are not available yet.' }
              )}
            >
              {unavailableValue}
            </EuiToolTip>
          ) : (
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiBadge color="primary">{workloadCount}</EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink onClick={() => onOpenWorkloads(serviceAccount)}>
                  {i18n.translate('xpack.security.management.serviceAccounts.table.viewWorkloads', {
                    defaultMessage: 'View',
                  })}
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
      },
      {
        name: i18n.translate('xpack.security.management.serviceAccounts.table.actionsColumn', {
          defaultMessage: 'Actions',
        }),
        width: '80px',
        align: 'right',
        actions: [
          {
            render: (serviceAccount) =>
              canDelete ? (
                <EuiToolTip
                  content={i18n.translate(
                    'xpack.security.management.serviceAccounts.table.deleteAction',
                    {
                      defaultMessage: 'Delete {name}',
                      values: { name: serviceAccount.name },
                    }
                  )}
                >
                  <EuiButtonIcon
                    aria-label={i18n.translate(
                      'xpack.security.management.serviceAccounts.table.deleteActionAriaLabel',
                      {
                        defaultMessage: 'Delete service account {name}',
                        values: { name: serviceAccount.name },
                      }
                    )}
                    color="danger"
                    iconType="trash"
                    onClick={() => onDeleteAccount(serviceAccount)}
                    data-test-subj={`serviceAccountDelete-${serviceAccount.id}`}
                  />
                </EuiToolTip>
              ) : (
                <></>
              ),
          },
        ],
      },
    ],
    [canDelete, onDeleteAccount, onOpenAccount, onOpenWorkloads]
  );

  return (
    <EuiInMemoryTable
      itemId="id"
      tableCaption={i18n.translate('xpack.security.management.serviceAccounts.table.tableCaption', {
        defaultMessage: 'Service accounts',
      })}
      rowHeader="name"
      columns={columns}
      items={serviceAccounts}
      pagination={{ initialPageSize: 10, pageSizeOptions: [10, 25, 50] }}
      search={search}
      selection={{ onSelectionChange: setSelection }}
      sorting={{ sort: { field: 'name', direction: 'asc' } }}
      data-test-subj="serviceAccountsTable"
    />
  );
};
