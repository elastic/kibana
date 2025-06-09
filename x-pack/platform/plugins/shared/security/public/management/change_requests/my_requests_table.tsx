/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, EuiTableDataType } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  formatDate,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';

import type { ChangeRequestsRepositoryClient } from '@kbn/change-requests-plugin/public';
import type { ChangeRequestDoc } from '@kbn/change-requests-plugin/server';
import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';

interface MyRequestsTableProps {
  changeRequestsRepositoryClient: ChangeRequestsRepositoryClient;
  coreStart: CoreStart;
}

type ChangeRequest = Omit<ChangeRequestDoc, 'user' | 'space'>;

const statusColorMap = {
  pending: 'hollow',
  approved: 'neutral',
  applied: 'success',
  rejected: 'warning',
  failed: 'danger',
};

const urgencyColorMap = {
  low: 'hollow',
  medium: 'warning',
  high: 'danger',
};

export const MyRequestsTable = ({
  changeRequestsRepositoryClient: client,
  coreStart,
}: MyRequestsTableProps) => {
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);

  useEffect(() => {
    async function loadMyChangeRequests() {
      const response = await client.fetch('GET /internal/change_requests/change_requests');
      setChangeRequests(response.change_requests);
    }

    loadMyChangeRequests();
  }, [client]);

  const columns: Array<EuiBasicTableColumn<ChangeRequest>> = [
    {
      field: 'title',
      name: 'Title',
      sortable: true,
      truncateText: true,
    },
    {
      field: 'status',
      name: 'Status',
      sortable: true,
      render: (status: ChangeRequest['status']) => (
        <EuiBadge color={statusColorMap[status]} css={{ textTransform: 'capitalize' }}>
          {status}
        </EuiBadge>
      ),
    },
    {
      field: 'urgency',
      name: 'Urgency',
      sortable: true,
      render: (urgency: ChangeRequest['urgency']) => (
        <EuiBadge color={urgencyColorMap[urgency]} css={{ textTransform: 'capitalize' }}>
          {urgency}
        </EuiBadge>
      ),
    },
    {
      field: 'submittedAt',
      name: 'Submitted',
      dataType: 'date' as EuiTableDataType,
      sortable: true,
    },
    {
      field: 'lastUpdatedAt',
      name: 'Last updated',
      dataType: 'date' as EuiTableDataType,
      sortable: true,
    },
    {
      field: 'actions',
      name: 'Actions',
      dataType: 'number' as EuiTableDataType,
      sortable: true,
      render: (actions: ChangeRequest['actions']) => actions.length,
    },
    {
      name: '',
      width: '5%',
      actions: [
        {
          name: 'Details',
          isPrimary: true,
          description: 'View details',
          icon: 'expand',
          type: 'icon',
          onClick: (changeRequest) => {
            coreStart.overlays.openFlyout(
              toMountPoint(<ChangeRequestDetailsFlyout changeRequest={changeRequest} />, coreStart)
            );
          },
        },
      ],
    },
  ];

  if (changeRequests.length === 0) {
    return <EuiText>No change requests submitted.</EuiText>;
  }

  return <EuiBasicTable items={changeRequests} columns={columns} rowHeader="title" />;
};

function ChangeRequestDetailsFlyout({ changeRequest }: { changeRequest: ChangeRequest }) {
  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{changeRequest.title}</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFlexGroup direction="column" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiText>{changeRequest.description}</EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexGroup gutterSize="s" direction="column" alignItems="flexStart">
                <EuiFlexItem>
                  <EuiText>Status:</EuiText>
                  <EuiBadge
                    color={statusColorMap[changeRequest.status]}
                    css={{ textTransform: 'capitalize' }}
                  >
                    {changeRequest.status}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText>Urgency:</EuiText>
                  <EuiBadge
                    color={urgencyColorMap[changeRequest.urgency]}
                    css={{ textTransform: 'capitalize' }}
                  >
                    {changeRequest.urgency}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiFlexGroup gutterSize="s" direction="column" alignItems="flexStart">
                <EuiFlexItem>
                  <EuiText>Submitted:</EuiText>
                  <EuiText>{formatDate(changeRequest.submittedAt)}</EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText>Last updated:</EuiText>
                  <EuiText>{formatDate(changeRequest.lastUpdatedAt)}</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexGroup>
          </EuiFlexItem>

          {changeRequest.status !== 'pending' && (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiFlexItem>
                  <EuiText>Reviewed by:</EuiText>
                  <EuiText>{changeRequest.reviewedBy}</EuiText>
                </EuiFlexItem>
                {changeRequest.reviewComment && (
                  <EuiFlexItem>
                    <EuiText>Review comment:</EuiText>
                    <EuiText>{changeRequest.reviewComment}</EuiText>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          )}

          <EuiFlexItem>
            <EuiText>Actions:</EuiText>
            <EuiSpacer />
            {changeRequest.actions.map((action, index) => (
              <EuiPanel paddingSize="m" key={index} hasShadow>
                <EuiFlexGroup direction="column" gutterSize="s">
                  <EuiFlexItem>
                    <EuiText size="s" color="subdued">
                      {action.originApp}
                    </EuiText>
                  </EuiFlexItem>

                  <EuiFlexItem>
                    <EuiTitle size="xs">
                      <h3>{action.label}</h3>
                    </EuiTitle>
                  </EuiFlexItem>

                  <EuiFlexItem>
                    <EuiText size="s">{action.summary}</EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            ))}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>
    </>
  );
}
