/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiSpacer,
  type CriteriaWithPagination,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { NotificationPolicyResponse } from '@kbn/alerting-v2-schemas';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { DeleteNotificationPolicyConfirmModal } from '../../components/notification_policy/delete_confirmation_modal';
import { NotificationPolicyDestinationBadge } from '../../components/notification_policy/notification_policy_destination_badge';
import { paths } from '../../constants';
import { useDeleteNotificationPolicy } from '../../hooks/use_delete_notification_policy';
import { useFetchNotificationPolicies } from '../../hooks/use_fetch_notification_policies';

const DEFAULT_PER_PAGE = 20;

export const ListNotificationPoliciesPage = () => {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [policyToDelete, setPolicyToDelete] = useState<NotificationPolicyResponse | null>(null);

  const { navigateToUrl } = useService(CoreStart('application'));
  const { basePath } = useService(CoreStart('http'));

  const { mutate: deleteNotificationPolicy, isLoading: isDeleting } = useDeleteNotificationPolicy();

  const navigateToCreate = () => {
    navigateToUrl(basePath.prepend(paths.notificationPolicyCreate));
  };

  const navigateToEdit = (id: string) => {
    navigateToUrl(basePath.prepend(paths.notificationPolicyEdit(id)));
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
      field: 'matcher',
      name: (
        <FormattedMessage
          id="xpack.alertingV2.notificationPoliciesList.column.matcher"
          defaultMessage="Matcher"
        />
      ),
      render: (matcher: NotificationPolicyResponse['matcher']) =>
        matcher ? (
          <EuiCodeBlock paddingSize="s" fontSize="s">
            {matcher}
          </EuiCodeBlock>
        ) : (
          '-'
        ),
    },
    {
      field: 'group_by',
      name: (
        <FormattedMessage
          id="xpack.alertingV2.notificationPoliciesList.column.groupBy"
          defaultMessage="Group by"
        />
      ),
      render: (groupBy: string[]) => (
        <EuiFlexGroup responsive={false} gutterSize="s" wrap>
          {groupBy?.map((group) => (
            <EuiFlexItem key={group} grow={false}>
              <EuiBadge color="hollow">{group}</EuiBadge>
            </EuiFlexItem>
          ))}
          {groupBy?.length === 0 ? '-' : null}
        </EuiFlexGroup>
      ),
    },
    {
      field: 'throttle',
      name: (
        <FormattedMessage
          id="xpack.alertingV2.notificationPoliciesList.column.throttle"
          defaultMessage="Throttle"
        />
      ),
      render: (throttle: NotificationPolicyResponse['throttle']) =>
        throttle ? <EuiBadge color="hollow">{throttle.interval}</EuiBadge> : '-',
    },
    {
      field: 'createdAt',
      name: (
        <FormattedMessage
          id="xpack.alertingV2.notificationPoliciesList.column.createdAt"
          defaultMessage="Created at"
        />
      ),
      render: (createdAt: string) => new Date(createdAt).toLocaleString(),
    },
    {
      name: i18n.translate('xpack.alertingV2.notificationPoliciesList.column.actions', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          name: i18n.translate('xpack.alertingV2.notificationPoliciesList.action.edit', {
            defaultMessage: 'Edit',
          }),
          description: i18n.translate(
            'xpack.alertingV2.notificationPoliciesList.action.edit.description',
            { defaultMessage: 'Edit this notification policy' }
          ),
          icon: 'pencil',
          type: 'icon',
          onClick: (item: NotificationPolicyResponse) => navigateToEdit(item.id),
        },
        {
          name: i18n.translate('xpack.alertingV2.notificationPoliciesList.action.delete', {
            defaultMessage: 'Delete',
          }),
          description: i18n.translate(
            'xpack.alertingV2.notificationPoliciesList.action.delete.description',
            { defaultMessage: 'Delete this notification policy' }
          ),
          icon: 'trash',
          type: 'icon',
          color: 'danger',
          onClick: (item: NotificationPolicyResponse) => setPolicyToDelete(item),
        },
      ],
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
