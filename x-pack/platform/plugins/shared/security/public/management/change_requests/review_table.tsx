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
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  formatDate,
} from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';

import type { ChangeRequestsRepositoryClient } from '@kbn/change-requests-plugin/public';
import type { ChangeRequestDoc } from '@kbn/change-requests-plugin/server';
import type { CoreStart, HttpStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';

interface MyRequestsTableProps {
  changeRequestsRepositoryClient: ChangeRequestsRepositoryClient;
  coreStart: CoreStart;
}

type ActionWithoutPrivilege = Omit<ChangeRequestDoc['actions'][number], 'requiredPrivileges'>;
type ChangeRequest = Omit<ChangeRequestDoc, 'space' | 'actions'> & {
  actions: ActionWithoutPrivilege[];
  id: string;
};

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

export const ReviewTable = ({
  changeRequestsRepositoryClient: client,
  coreStart,
}: MyRequestsTableProps) => {
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);

  useEffect(() => {
    async function loadMyChangeRequests() {
      const response = await client.fetch('GET /internal/change_requests/manage/change_requests');
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
              toMountPoint(
                <ChangeRequestDetailsFlyout
                  changeRequest={changeRequest}
                  changeRequestsRepositoryClient={client}
                  http={coreStart.http}
                />,
                coreStart
              )
            );
          },
        },
      ],
    },
  ];

  if (changeRequests.length === 0) {
    return <EuiText>No change requests to review.</EuiText>;
  }

  return <EuiBasicTable items={changeRequests} columns={columns} rowHeader="title" />;
};

interface ChangeRequestDetailsFlyoutProps {
  changeRequest: ChangeRequest;
  changeRequestsRepositoryClient: ChangeRequestsRepositoryClient;
  http: HttpStart;
}

function ChangeRequestDetailsFlyout({
  changeRequest,
  changeRequestsRepositoryClient: client,
  http,
}: ChangeRequestDetailsFlyoutProps) {
  // I need some way to reload the change request once it changes on the server
  const [isLoading, setIsLoading] = useState(false);

  const approveChangeRequest = useCallback(() => {
    async function approve() {
      await client.fetch('PATCH /internal/change_requests/manage/change_requests/{id}', {
        params: {
          path: {
            id: changeRequest.id,
          },
          body: {
            status: 'approved',
          },
        },
      });

      try {
        // Try to run all actions
        await Promise.all(
          changeRequest.actions.map((action) =>
            http.fetch(action.request.endpoint, {
              // What about the path params?
              method: action.request.method,
              version: action.request.version,
              body: action.request.body ? JSON.stringify(action.request.body) : null,
              query: action.request.query,
            })
          )
        );

        await client.fetch('PATCH /internal/change_requests/manage/change_requests/{id}', {
          params: {
            path: {
              id: changeRequest.id,
            },
            body: {
              status: 'applied',
            },
          },
        });
      } catch (error) {
        // Update the component state to mark WHICH action failed in case the admin wants to retry only those
        // As well as show the admin some error message etc.

        // How could we handle rollbacks?

        await client.fetch('PATCH /internal/change_requests/manage/change_requests/{id}', {
          params: {
            path: {
              id: changeRequest.id,
            },
            body: {
              status: 'failed',
              reviewComment: error.message,
            },
          },
        });
      } finally {
        setIsLoading(false);
      }
    }

    setIsLoading(true);
    approve();
  }, [client, changeRequest, http]);

  const rejectChangeRequest = useCallback(() => {
    async function reject() {
      // I need some way for the user to modify the review comment, probably should trigger some kind of
      // dialog that captures that and then calls this endpoint, can also work as a confirmation step
      await client.fetch('PATCH /internal/change_requests/manage/change_requests/{id}', {
        params: {
          path: {
            id: changeRequest.id,
          },
          body: {
            status: 'rejected',
            reviewComment: 'I do not like this idea',
          },
        },
      });

      setIsLoading(false);
    }

    setIsLoading(true);
    reject();
  }, [client, changeRequest]);

  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{changeRequest.title}</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFlexGroup direction="column" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiText>Submitted by:</EuiText>
            {/* Is there a locator I can use? */}
            <EuiLink href={`/ftw/app/management/security/users/edit/${changeRequest.user}`}>
              {changeRequest.user}
            </EuiLink>
          </EuiFlexItem>

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
                    <EuiFlexGroup justifyContent="spaceBetween">
                      <EuiText size="s" color="subdued">
                        {action.originApp}
                      </EuiText>
                      {/* Once the request fails or succeeds, I want this to update to a check mark or some fail icon */}
                      {isLoading && <EuiLoadingSpinner size="m" />}
                    </EuiFlexGroup>
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

      <EuiModalFooter>
        <EuiButton
          disabled={isLoading || ['approved', 'applied'].includes(changeRequest.status)}
          onClick={approveChangeRequest}
        >
          Approve
        </EuiButton>
        <EuiButton
          disabled={isLoading || ['approved', 'applied', 'rejected'].includes(changeRequest.status)}
          color="danger"
          onClick={rejectChangeRequest}
        >
          Reject
        </EuiButton>
      </EuiModalFooter>
    </>
  );
}
