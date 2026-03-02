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
  EuiCodeBlock,
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
  UpdateNotificationPolicyBody,
} from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { NotificationPolicyFormFlyout } from '../../components/notification_policy/form';
import { NotificationPolicyDestinationBadge } from '../../components/notification_policy/notification_policy_destination_badge';
import { useCreateNotificationPolicy } from '../../hooks/use_create_notification_policy';
import { useFetchNotificationPolicies } from '../../hooks/use_fetch_notification_policies';
import { useUpdateNotificationPolicy } from '../../hooks/use_update_notification_policy';

type FlyoutState = { mode: 'create' } | { mode: 'edit'; policy: NotificationPolicyResponse } | null;

const DEFAULT_PER_PAGE = 20;

export const ListNotificationPoliciesPage = () => {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [flyoutState, setFlyoutState] = useState<FlyoutState>(null);

  const { mutate: createNotificationPolicy, isLoading: isCreating } = useCreateNotificationPolicy();
  const { mutate: updateNotificationPolicy, isLoading: isUpdating } = useUpdateNotificationPolicy();

  const closeFlyout = () => setFlyoutState(null);

  const handleSave = (data: CreateNotificationPolicyData) => {
    createNotificationPolicy(data, {
      onSuccess: closeFlyout,
    });
  };

  const handleUpdate = (id: string, data: UpdateNotificationPolicyBody) => {
    updateNotificationPolicy({ id, data }, { onSuccess: closeFlyout });
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
      field: 'description',
      name: (
        <FormattedMessage
          id="xpack.alertingV2.notificationPoliciesList.column.description"
          defaultMessage="Description"
        />
      ),
      truncateText: true,
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
          onClick: (item: NotificationPolicyResponse) =>
            setFlyoutState({ mode: 'edit', policy: item }),
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
          <EuiButton key="create-policy" onClick={() => setFlyoutState({ mode: 'create' })}>
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
      {flyoutState?.mode === 'create' && (
        <NotificationPolicyFormFlyout
          onClose={closeFlyout}
          onSave={handleSave}
          isLoading={isCreating}
        />
      )}
      {flyoutState?.mode === 'edit' && (
        <NotificationPolicyFormFlyout
          onClose={closeFlyout}
          onUpdate={handleUpdate}
          initialValues={flyoutState.policy}
          isLoading={isUpdating}
        />
      )}
    </>
  );
};
