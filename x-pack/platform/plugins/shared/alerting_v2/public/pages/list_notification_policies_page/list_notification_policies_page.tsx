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
import type { NotificationPolicyResponse } from '@kbn/alerting-v2-schemas';
import { useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { NotificationPoliciesApi } from '../../services/notification_policies_api';
import { NotificationPolicyDestinationBadge } from '../../components/notification_policy/notification_policy_destination_badge';

const DEFAULT_PER_PAGE = 20;

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export const ListNotificationPoliciesPage = () => {
  const notificationPoliciesApi = useService(NotificationPoliciesApi);
  const isMounted = useMountedState();
  const [items, setItems] = useState<NotificationPolicyResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPolicies = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await notificationPoliciesApi.listNotificationPolicies({
          page: page + 1,
          perPage,
        });
        if (isMounted()) {
          setItems(result.items);
          setTotal(result.total);
        }
      } catch (err) {
        if (isMounted()) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (isMounted()) {
          setIsLoading(false);
        }
      }
    };

    loadPolicies();
  }, [notificationPoliciesApi, isMounted, page, perPage]);

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
        <EuiFlexGroup responsive={false} gutterSize="s">
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
  ];

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
          <EuiButton key="create-policy" onClick={() => {}}>
            <FormattedMessage
              id="xpack.alertingV2.notificationPoliciesList.createPolicyButton"
              defaultMessage="Create policy"
            />
          </EuiButton>,
        ]}
      />
      <EuiSpacer size="m" />
      {error ? (
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
            {error}
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
    </>
  );
};
