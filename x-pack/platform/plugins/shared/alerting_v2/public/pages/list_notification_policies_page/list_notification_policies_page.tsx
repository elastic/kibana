/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiSpacer,
  type CriteriaWithPagination,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type {
  CreateNotificationPolicyData,
  NotificationPolicyResponse,
} from '@kbn/alerting-v2-schemas';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import moment from 'moment';
import React, { useState } from 'react';
import { DeleteNotificationPolicyConfirmModal } from '../../components/notification_policy/delete_confirmation_modal';
import { NotificationPolicyDestinationsSummary } from '../../components/notification_policy/notification_policy_destinations_summary';
import { NotificationPolicySnoozePopover } from '../../components/notification_policy/notification_policy_snooze_popover';
import { NotificationPolicyStateBadge } from '../../components/notification_policy/notification_policy_state_badge';
import { paths } from '../../constants';
import { useCreateNotificationPolicy } from '../../hooks/use_create_notification_policy';
import { useDeleteNotificationPolicy } from '../../hooks/use_delete_notification_policy';
import { useDisableNotificationPolicy } from '../../hooks/use_disable_notification_policy';
import { useEnableNotificationPolicy } from '../../hooks/use_enable_notification_policy';
import { useFetchNotificationPolicies } from '../../hooks/use_fetch_notification_policies';
import { useSnoozeNotificationPolicy } from '../../hooks/use_snooze_notification_policy';
import { useUnsnoozeNotificationPolicy } from '../../hooks/use_unsnooze_notification_policy';
import { NotificationPolicyActionsCell } from './components/notification_policy_actions_cell';
import { NotificationPoliciesSearchBar } from './components/notification_policies_search_bar';

const DEFAULT_PER_PAGE = 20;

export const ListNotificationPoliciesPage = () => {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [search, setSearch] = useState('');
  const [enabled, setEnabled] = useState('');
  const [sortField, setSortField] = useState<'name' | 'updatedAt' | 'updatedByUsername'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [policyToDelete, setPolicyToDelete] = useState<NotificationPolicyResponse | null>(null);

  const { navigateToUrl } = useService(CoreStart('application'));
  const { basePath } = useService(CoreStart('http'));
  const settings = useService(CoreStart('settings'));
  const dateTimeFormat = settings.client.get<string>('dateFormat');

  const { mutate: createNotificationPolicy } = useCreateNotificationPolicy();
  const { mutate: deleteNotificationPolicy, isLoading: isDeleting } = useDeleteNotificationPolicy();
  const {
    mutate: enablePolicy,
    isLoading: isEnabling,
    variables: enableVariables,
  } = useEnableNotificationPolicy();
  const {
    mutate: disablePolicy,
    isLoading: isDisabling,
    variables: disableVariables,
  } = useDisableNotificationPolicy();
  const {
    mutate: snoozePolicy,
    isLoading: isSnoozing,
    variables: snoozeVariables,
  } = useSnoozeNotificationPolicy();
  const {
    mutate: unsnoozePolicy,
    isLoading: isUnsnoozing,
    variables: unsnoozeVariables,
  } = useUnsnoozeNotificationPolicy();

  const navigateToCreate = () => {
    navigateToUrl(basePath.prepend(paths.notificationPolicyCreate));
  };

  const navigateToEdit = (id: string) => {
    navigateToUrl(basePath.prepend(paths.notificationPolicyEdit(id)));
  };

  const clonePolicy = (policy: NotificationPolicyResponse) => {
    const { name, description, destinations, matcher, groupBy, throttle } = policy;
    const data: CreateNotificationPolicyData = {
      name: `${name} [clone]`,
      description,
      destinations,
      ...(matcher != null && { matcher }),
      ...(groupBy != null && { groupBy }),
      ...(throttle != null && { throttle }),
    };
    createNotificationPolicy(data);
  };

  const { data, isLoading, isError, error } = useFetchNotificationPolicies({
    page: page + 1,
    perPage,
    search: search || undefined,
    enabled: enabled === 'true' ? true : enabled === 'false' ? false : undefined,
    sortField,
    sortOrder: sortDirection,
  });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const handleEnabledChange = (value: string) => {
    setEnabled(value);
    setPage(0);
  };

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const onTableChange = ({
    page: tablePage,
    sort,
  }: CriteriaWithPagination<NotificationPolicyResponse>) => {
    setPage(tablePage.index);
    setPerPage(tablePage.size);
    if (sort) {
      setSortField(sort.field as 'name' | 'updatedAt' | 'updatedByUsername');
      setSortDirection(sort.direction);
    }
  };

  const pagination = {
    pageIndex: page,
    pageSize: perPage,
    totalItemCount: total,
    pageSizeOptions: [10, 20, 50],
  };

  const columns: Array<EuiBasicTableColumn<NotificationPolicyResponse>> = [
    {
      field: 'name',
      name: (
        <FormattedMessage
          id="xpack.alertingV2.notificationPoliciesList.column.name"
          defaultMessage="Name"
        />
      ),
      sortable: true,
    },
    {
      field: 'destinations',
      name: (
        <FormattedMessage
          id="xpack.alertingV2.notificationPoliciesList.column.destinations"
          defaultMessage="Destinations"
        />
      ),
      render: (destinations: NotificationPolicyResponse['destinations']) => (
        <NotificationPolicyDestinationsSummary destinations={destinations} />
      ),
    },
    {
      field: 'enabled',
      name: (
        <FormattedMessage
          id="xpack.alertingV2.notificationPoliciesList.column.state"
          defaultMessage="State"
        />
      ),
      width: '120px',
      render: (_enabled: boolean, policy: NotificationPolicyResponse) => (
        <NotificationPolicyStateBadge
          policy={policy}
          onEnable={(id) => enablePolicy(id)}
          onDisable={(id) => disablePolicy(id)}
          isLoading={
            (isEnabling && enableVariables === policy.id) ||
            (isDisabling && disableVariables === policy.id)
          }
        />
      ),
    },
    {
      field: 'snoozedUntil',
      name: (
        <FormattedMessage
          id="xpack.alertingV2.notificationPoliciesList.column.notify"
          defaultMessage="Notify"
        />
      ),
      width: '120px',
      render: (_snoozedUntil: string | undefined, policy: NotificationPolicyResponse) => {
        if (!policy.enabled) {
          return null;
        }
        return (
          <NotificationPolicySnoozePopover
            policy={policy}
            onSnooze={(id, until) => snoozePolicy({ id, snoozedUntil: until })}
            onCancelSnooze={(id) => unsnoozePolicy(id)}
            isLoading={
              (isSnoozing && snoozeVariables?.id === policy.id) ||
              (isUnsnoozing && unsnoozeVariables === policy.id)
            }
          />
        );
      },
    },
    {
      field: 'updatedAt',
      name: (
        <FormattedMessage
          id="xpack.alertingV2.notificationPoliciesList.column.updatedAt"
          defaultMessage="Last update"
        />
      ),
      sortable: true,
      render: (updatedAt: string) => moment(updatedAt).format(dateTimeFormat),
    },
    {
      field: 'updatedByUsername',
      sortable: true,
      width: '200px',
      name: (
        <FormattedMessage
          id="xpack.alertingV2.notificationPoliciesList.column.updatedByUsername"
          defaultMessage="Updated by"
        />
      ),
    },
    {
      name: i18n.translate('xpack.alertingV2.notificationPoliciesList.column.actions', {
        defaultMessage: 'Actions',
      }),
      width: '120px',
      render: (policy: NotificationPolicyResponse) => (
        <NotificationPolicyActionsCell
          policy={policy}
          onEdit={navigateToEdit}
          onClone={clonePolicy}
          onDelete={setPolicyToDelete}
          onEnable={(id) => enablePolicy(id)}
          onDisable={(id) => disablePolicy(id)}
          onSnooze={(id, until) => snoozePolicy({ id, snoozedUntil: until })}
          onCancelSnooze={(id) => unsnoozePolicy(id)}
          isStateLoading={
            (isEnabling && enableVariables === policy.id) ||
            (isDisabling && disableVariables === policy.id)
          }
        />
      ),
    },
  ];

  const errorMessage = isError && error ? error.message : null;

  return (
    <>
      <EuiPageHeader
        pageTitle={
          <FormattedMessage
            id="xpack.alertingV2.notificationPoliciesList.pageTitle"
            defaultMessage="Notification Policies"
          />
        }
        rightSideItems={[
          <EuiButton key="create-policy" onClick={navigateToCreate}>
            <FormattedMessage
              id="xpack.alertingV2.notificationPoliciesList.createPolicyButton"
              defaultMessage="Create policy"
            />
          </EuiButton>,
        ]}
      />
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiSpacer size="m" />
        <EuiFlexItem grow={false}>
          <NotificationPoliciesSearchBar
            onSearchChange={handleSearchChange}
            enabled={enabled}
            onEnabledChange={handleEnabledChange}
          />
        </EuiFlexItem>
        {errorMessage ? (
          <>
            <EuiCallOut
              announceOnMount
              title={
                <FormattedMessage
                  id="xpack.alertingV2.notificationPoliciesList.loadErrorTitle"
                  defaultMessage="Failed to load notification policies"
                />
              }
              color="danger"
              iconType="error"
            >
              {errorMessage}
            </EuiCallOut>
            <EuiSpacer />
          </>
        ) : null}
        <EuiBasicTable
          items={items}
          columns={columns}
          responsiveBreakpoint={false}
          loading={isLoading}
          pagination={pagination}
          sorting={{
            sort: {
              field: sortField,
              direction: sortDirection,
            },
          }}
          onChange={onTableChange}
          tableCaption={i18n.translate('xpack.alertingV2.notificationPoliciesList.tableCaption', {
            defaultMessage: 'Notification Policies',
          })}
        />
      </EuiFlexGroup>

      {policyToDelete && (
        <DeleteNotificationPolicyConfirmModal
          policyName={policyToDelete.name}
          onCancel={() => setPolicyToDelete(null)}
          onConfirm={() => {
            deleteNotificationPolicy(policyToDelete.id, {
              onSuccess: () => setPolicyToDelete(null),
            });
          }}
          isLoading={isDeleting}
        />
      )}
    </>
  );
};
