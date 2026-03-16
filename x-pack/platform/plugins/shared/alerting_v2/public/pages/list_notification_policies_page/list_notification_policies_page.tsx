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
import React, { useState } from 'react';
import { DeleteNotificationPolicyConfirmModal } from '../../components/notification_policy/delete_confirmation_modal';
import { NotificationPolicyDestinationBadge } from '../../components/notification_policy/notification_policy_destination_badge';
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

const DEFAULT_PER_PAGE = 20;

export const ListNotificationPoliciesPage = () => {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [policyToDelete, setPolicyToDelete] = useState<NotificationPolicyResponse | null>(null);

  const { navigateToUrl } = useService(CoreStart('application'));
  const { basePath } = useService(CoreStart('http'));

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
    const { name, description, destinations, matcher, group_by, throttle } = policy;
    const data: CreateNotificationPolicyData = {
      name: `${name} [clone]`,
      description,
      destinations,
      ...(matcher != null && { matcher }),
      ...(group_by != null && { group_by }),
      ...(throttle != null && { throttle }),
    };
    createNotificationPolicy(data);
  };

  const { data, isLoading, isError, error } = useFetchNotificationPolicies({
    page: page + 1,
    perPage,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const onTableChange = ({
    page: tablePage,
  }: CriteriaWithPagination<NotificationPolicyResponse>) => {
    setPage(tablePage.index);
    setPerPage(tablePage.size);
  };

  const pagination = {
    pageIndex: page,
    pageSize: perPage,
    totalItemCount: total,
    pageSizeOptions: [1, 10, 20, 50],
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
        <EuiFlexGroup responsive={false} gutterSize="s" wrap>
          {destinations?.map((destination) => (
            <EuiFlexItem key={destination.id} grow={false}>
              <NotificationPolicyDestinationBadge destination={destination} />
            </EuiFlexItem>
          ))}
          {destinations?.length === 0 ? '-' : null}
        </EuiFlexGroup>
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
      render: (updatedAt: string) =>
        new Date(updatedAt).toLocaleString(undefined, {
          month: 'short',
          year: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
    },
    {
      name: i18n.translate('xpack.alertingV2.notificationPoliciesList.column.actions', {
        defaultMessage: 'Actions',
      }),
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
      <EuiSpacer size="m" />
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
        onChange={onTableChange}
        tableCaption={i18n.translate('xpack.alertingV2.notificationPoliciesList.tableCaption', {
          defaultMessage: 'Notification Policies',
        })}
      />
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
