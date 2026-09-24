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
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import React, { useMemo } from 'react';

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
  hasMore: boolean;
  isLoadingMore: boolean;
  hasLoadMoreError: boolean;
  onLoadMore: () => void;
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
  hasMore,
  isLoadingMore,
  hasLoadMoreError,
  onLoadMore,
}: ServiceAccountsTableProps) => {
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
        render: (name: string, { enabled }: ServiceAccountTableItem) =>
          enabled ? (
            name
          ) : (
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
              <EuiFlexItem grow={false}>{name}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={i18n.translate(
                    'xpack.security.management.serviceAccounts.table.disabledTooltip',
                    { defaultMessage: 'This account is disabled and cannot authenticate.' }
                  )}
                >
                  <EuiBadge tabIndex={0} data-test-subj="serviceAccountDisabledBadge">
                    {i18n.translate(
                      'xpack.security.management.serviceAccounts.table.disabledBadge',
                      { defaultMessage: 'Disabled' }
                    )}
                  </EuiBadge>
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
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
        sortable: ({ roles }) => [...roles].sort().join(','),
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
                <EuiAvatar aria-hidden={true} name={label} size="s" />
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
        render: (workloadCount: number | undefined) =>
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
            <EuiBadge color="primary">{workloadCount}</EuiBadge>
          ),
      },
    ],
    []
  );

  return (
    <>
      <EuiInMemoryTable
        itemId="id"
        tableCaption={i18n.translate(
          'xpack.security.management.serviceAccounts.table.tableCaption',
          {
            defaultMessage: 'Service accounts',
          }
        )}
        rowHeader="name"
        columns={columns}
        items={serviceAccounts}
        pagination={{ initialPageSize: 10, pageSizeOptions: [10, 25, 50] }}
        search={search}
        sorting={{ sort: { field: 'name', direction: 'asc' } }}
        data-test-subj="serviceAccountsTable"
      />
      {(hasMore || hasLoadMoreError) && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiText color={hasLoadMoreError ? 'danger' : 'subdued'} size="s">
                {hasLoadMoreError
                  ? i18n.translate(
                      'xpack.security.management.serviceAccounts.table.loadMoreError',
                      { defaultMessage: 'Unable to load more service accounts.' }
                    )
                  : i18n.translate(
                      'xpack.security.management.serviceAccounts.table.loadedAccountsNotice',
                      {
                        defaultMessage:
                          'Search and filters currently include {count, plural, one {# loaded account} other {# loaded accounts}}.',
                        values: { count: serviceAccounts.length },
                      }
                    )}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={onLoadMore}
                isLoading={isLoadingMore}
                data-test-subj="serviceAccountsLoadMore"
              >
                {hasLoadMoreError
                  ? i18n.translate(
                      'xpack.security.management.serviceAccounts.table.retryLoadMoreButton',
                      { defaultMessage: 'Try again' }
                    )
                  : i18n.translate(
                      'xpack.security.management.serviceAccounts.table.loadMoreButton',
                      { defaultMessage: 'Load more' }
                    )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};
