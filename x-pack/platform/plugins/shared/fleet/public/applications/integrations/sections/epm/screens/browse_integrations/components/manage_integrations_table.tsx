/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexItem,
  EuiFlexGroup,
  EuiLink,
  EuiLoadingSpinner,
  EuiPopover,
  EuiSelectable,
  EuiText,
  useEuiTheme,
  EuiInMemoryTable,
  EuiSpacer,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import type { EuiBasicTableColumn, EuiSearchBarProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useQuery } from '@kbn/react-query';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserAvatar } from '@kbn/user-profile-components';
import type { DataStreamResponse, TaskStatus } from '@kbn/automatic-import-v2-plugin/common';

import { PackageIcon } from '../../../../../../../components/package_icon';

import { useStartServices } from '../../../../../hooks';

import { ManageIntegrationActions } from './manage_integration_actions';
import type { ReviewIntegrationDetails } from './manage_integration_actions';
import { CreateNewIntegrationButton } from './create_new_integration';

export interface CreatedIntegrationRow {
  integrationId: string;
  title: string;
  logo?: string;
  totalDataStreamCount: number;
  successfulDataStreamCount: number;
  version?: string;
  createdBy: string;
  createdByProfileUid?: string;
  status: TaskStatus;
}

const canReviewApproveIntegration = (item: CreatedIntegrationRow): boolean =>
  item.totalDataStreamCount > 0 &&
  item.successfulDataStreamCount === item.totalDataStreamCount &&
  (item.status === 'completed' || item.status === 'approved');

function getStatusDisplay(status: TaskStatus): {
  color: 'success' | 'danger' | 'default' | 'hollow';
  iconType?: string;
  label: string;
  isInProgress?: boolean;
} {
  switch (status) {
    case 'approved':
    case 'completed':
      return { color: 'success', iconType: 'check', label: 'Success' };
    case 'failed':
    case 'cancelled':
      return { color: 'danger', iconType: 'cross', label: 'Fail' };
    case 'processing':
    case 'pending':
    default:
      return { color: 'hollow', label: 'In progress', isInProgress: true };
  }
}

export const ManageIntegrationsTable: React.FC<{
  integrations: CreatedIntegrationRow[];
  isLoading: boolean;
  isError: boolean;
  onRefetch: () => void;
}> = ({ integrations, isLoading, isError, onRefetch }) => {
  const { euiTheme } = useEuiTheme();
  const {
    application,
    automaticImportVTwo,
    http,
    notifications,
    userProfile: userProfileService,
  } = useStartServices();

  const uniqueProfileUids = useMemo(() => {
    const uids = integrations
      .map((i) => i.createdByProfileUid)
      .filter((uid): uid is string => !!uid);
    return [...new Set(uids)];
  }, [integrations]);

  const { data: userProfiles = new Map<string, UserProfileWithAvatar>() } = useQuery(
    ['manage-integrations-user-profiles', ...uniqueProfileUids],
    async () => {
      const profiles = await userProfileService.bulkGet<{
        avatar: { initials?: string; color?: string; imageUrl?: string | null };
      }>({
        uids: new Set(uniqueProfileUids),
        dataPath: 'avatar',
      });
      const profileMap = new Map<string, UserProfileWithAvatar>();
      for (const profile of profiles) {
        profileMap.set(profile.uid, profile as UserProfileWithAvatar);
      }
      return profileMap;
    },
    {
      enabled: uniqueProfileUids.length > 0,
      refetchOnWindowFocus: false,
    }
  );

  const [isActionsFilterOpen, setIsActionsFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  const integrationsWithActions = useMemo(() => {
    return integrations.map((item) => {
      let displayStatus: string;
      switch (item.status) {
        case 'completed':
        case 'approved':
          displayStatus = 'success';
          break;
        case 'pending':
        case 'processing':
          displayStatus = 'in_progress';
          break;
        case 'failed':
          displayStatus = 'failed';
          break;
        case 'cancelled':
          displayStatus = 'cancelled';
          break;
        default:
          displayStatus = 'in_progress';
      }
      return {
        ...item,
        displayStatus,
        availableAction: canReviewApproveIntegration(item) ? 'review_approve' : 'edit',
      };
    });
  }, [integrations]);

  const handleActionsChange = useCallback((options: EuiSelectableOption[]) => {
    const selected = options.filter((opt) => opt.checked === 'on').map((opt) => opt.key as string);
    setSelectedActions(selected);
  }, []);

  const handleStatusChange = useCallback((options: EuiSelectableOption[]) => {
    const selected = options.filter((opt) => opt.checked === 'on').map((opt) => opt.key as string);
    setSelectedStatuses(selected);
  }, []);

  const goToEditIntegration = useCallback(
    (integrationId: string) => {
      application.navigateToApp('automaticImportVTwo', {
        path: `/edit/${integrationId}`,
      });
    },
    [application]
  );

  const getEditIntegrationHref = useCallback(
    (integrationId: string) =>
      application.getUrlForApp('automaticImportVTwo', {
        path: `/edit/${integrationId}`,
      }),
    [application]
  );

  const deleteIntegration = useCallback(
    async (integrationId: string) => {
      try {
        await http.delete(
          `/api/automatic_import_v2/integrations/${encodeURIComponent(integrationId)}`,
          { version: '1' }
        );
        notifications.toasts.addSuccess({
          title: i18n.translate(
            'xpack.fleet.epmList.manageIntegrations.actions.deleteSuccessTitle',
            { defaultMessage: 'Integration deleted' }
          ),
        });
        onRefetch();
      } catch (error) {
        notifications.toasts.addError(error as Error, {
          title: i18n.translate('xpack.fleet.epmList.manageIntegrations.actions.deleteErrorTitle', {
            defaultMessage: 'Failed to delete integration',
          }),
        });
        throw error;
      }
    },
    [http, notifications, onRefetch]
  );

  const fetchIntegrationReviewDetails = useCallback(
    async (integrationId: string): Promise<ReviewIntegrationDetails> => {
      const response = await http.get<{
        integrationResponse: {
          title: string;
          version?: string;
          dataStreams: DataStreamResponse[];
        };
      }>(`/api/automatic_import_v2/integrations/${encodeURIComponent(integrationId)}`, {
        version: '1',
      });

      const integrationResponse = response.integrationResponse;
      return {
        title: integrationResponse.title,
        version: integrationResponse.version,
        dataStreams: integrationResponse.dataStreams ?? [],
      };
    },
    [http]
  );

  const approveAndDeployIntegration = useCallback(
    async (integrationId: string, version: string) => {
      try {
        await http.post(
          `/api/automatic_import_v2/integrations/${encodeURIComponent(integrationId)}/approve`,
          {
            version: '1',
            body: JSON.stringify({ version }),
          }
        );

        notifications.toasts.addSuccess({
          title: i18n.translate(
            'xpack.fleet.epmList.manageIntegrations.actions.approveSuccessTitle',
            {
              defaultMessage: 'Integration approved and ready to deploy',
            }
          ),
        });
        onRefetch();
      } catch (error) {
        notifications.toasts.addError(error as Error, {
          title: i18n.translate(
            'xpack.fleet.epmList.manageIntegrations.actions.approveErrorTitle',
            {
              defaultMessage: 'Failed to approve integration',
            }
          ),
        });
        throw error;
      }
    },
    [http, notifications, onRefetch]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<CreatedIntegrationRow>>>(
    () => [
      {
        field: 'title',
        name: (
          <FormattedMessage
            id="xpack.fleet.epmList.manageIntegrations.table.integrationName"
            defaultMessage="Integration name"
          />
        ),
        render: (title: string, item: CreatedIntegrationRow) => (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <PackageIcon
                packageName={item.integrationId}
                integrationName={item.title}
                version={item.version ?? '0.0.0'}
                size="m"
                tryApi={true}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiLink href={getEditIntegrationHref(item.integrationId)}>{title}</EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        name: (
          <FormattedMessage
            id="xpack.fleet.epmList.manageIntegrations.table.dataStreams"
            defaultMessage="Data Streams"
          />
        ),
        render: (item: CreatedIntegrationRow) => (
          <EuiBadge color="hollow">
            {item.successfulDataStreamCount}/{item.totalDataStreamCount}
          </EuiBadge>
        ),
      },
      {
        field: 'version',
        name: (
          <FormattedMessage
            id="xpack.fleet.epmList.manageIntegrations.table.version"
            defaultMessage="Version"
          />
        ),
        render: (version: string | undefined) => version ?? '-',
      },
      {
        field: 'createdBy',
        name: (
          <FormattedMessage
            id="xpack.fleet.epmList.manageIntegrations.table.createdBy"
            defaultMessage="Created by"
          />
        ),
        render: (_createdBy: string, item: CreatedIntegrationRow) => {
          const profile = item.createdByProfileUid
            ? userProfiles.get(item.createdByProfileUid)
            : undefined;
          const fallbackUser = { username: item.createdBy };
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <UserAvatar
                  user={profile?.user ?? fallbackUser}
                  avatar={profile?.data.avatar}
                  size="s"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{profile?.user.full_name || item.createdBy}</EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'status',
        name: (
          <FormattedMessage
            id="xpack.fleet.epmList.manageIntegrations.table.status"
            defaultMessage="Status"
          />
        ),
        render: (status: TaskStatus) => {
          const { color, iconType, label, isInProgress } = getStatusDisplay(status);
          if (isInProgress) {
            return (
              <EuiBadge
                color={color}
                style={{ backgroundColor: euiTheme.colors.backgroundLightText }}
              >
                <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiLoadingSpinner size="s" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>{label}</EuiFlexItem>
                </EuiFlexGroup>
              </EuiBadge>
            );
          }
          return (
            <EuiBadge color={color} iconType={iconType}>
              {label}
            </EuiBadge>
          );
        },
      },
      {
        name: '',
        render: (item: CreatedIntegrationRow) => {
          if (canReviewApproveIntegration(item)) {
            return (
              <ManageIntegrationActions
                integration={item}
                canReviewApprove={true}
                inlineActionType="reviewApprove"
                showMenuButton={false}
                onEdit={goToEditIntegration}
                onDelete={deleteIntegration}
                DataStreamResultsFlyoutComponent={
                  automaticImportVTwo?.components.DataStreamResultsFlyout
                }
                onFetchReviewDetails={fetchIntegrationReviewDetails}
                onApproveAndDeploy={approveAndDeployIntegration}
              />
            );
          }

          if (item.status === 'failed' || item.status === 'cancelled') {
            return (
              <ManageIntegrationActions
                integration={item}
                canReviewApprove={false}
                inlineActionType="editIntegration"
                showMenuButton={false}
                onEdit={goToEditIntegration}
                onDelete={deleteIntegration}
                DataStreamResultsFlyoutComponent={
                  automaticImportVTwo?.components.DataStreamResultsFlyout
                }
                onFetchReviewDetails={fetchIntegrationReviewDetails}
                onApproveAndDeploy={approveAndDeployIntegration}
              />
            );
          }

          return null;
        },
      },
      {
        name: (
          <FormattedMessage
            id="xpack.fleet.epmList.manageIntegrations.table.actions"
            defaultMessage="Actions"
          />
        ),
        width: '80px',
        render: (item: CreatedIntegrationRow) => (
          <ManageIntegrationActions
            integration={item}
            canReviewApprove={canReviewApproveIntegration(item)}
            onEdit={goToEditIntegration}
            onDelete={deleteIntegration}
            DataStreamResultsFlyoutComponent={
              automaticImportVTwo?.components.DataStreamResultsFlyout
            }
            onFetchReviewDetails={fetchIntegrationReviewDetails}
            onApproveAndDeploy={approveAndDeployIntegration}
          />
        ),
      },
    ],
    [
      getEditIntegrationHref,
      goToEditIntegration,
      deleteIntegration,
      fetchIntegrationReviewDetails,
      approveAndDeployIntegration,
      automaticImportVTwo?.components.DataStreamResultsFlyout,
      euiTheme.colors.backgroundLightText,
      userProfiles,
    ]
  );

  if (isLoading) {
    return <EuiEmptyPrompt icon={<EuiLoadingSpinner size="xl" />} />;
  }

  if (isError) {
    return (
      <EuiCallOut
        announceOnMount
        color="danger"
        iconType="error"
        title={
          <FormattedMessage
            id="xpack.fleet.epmList.manageIntegrations.errorTitle"
            defaultMessage="Unable to load integrations"
          />
        }
      />
    );
  }

  const actionsOptions: EuiSelectableOption[] = [
    {
      label: 'Review & Approve',
      key: 'review_approve',
      checked: selectedActions.includes('review_approve') ? 'on' : undefined,
    },
    { label: 'Edit', key: 'edit', checked: selectedActions.includes('edit') ? 'on' : undefined },
  ];

  const statusOptions: EuiSelectableOption[] = [
    {
      label: 'Success',
      key: 'success',
      checked: selectedStatuses.includes('success') ? 'on' : undefined,
    },
    {
      label: 'In progress',
      key: 'in_progress',
      checked: selectedStatuses.includes('in_progress') ? 'on' : undefined,
    },
    {
      label: 'Failed',
      key: 'failed',
      checked: selectedStatuses.includes('failed') ? 'on' : undefined,
    },
    {
      label: 'Cancelled',
      key: 'cancelled',
      checked: selectedStatuses.includes('cancelled') ? 'on' : undefined,
    },
  ];

  const filteredIntegrations = integrationsWithActions.filter((item) => {
    const matchesAction =
      selectedActions.length === 0 || selectedActions.includes(item.availableAction);
    const matchesStatus =
      selectedStatuses.length === 0 || selectedStatuses.includes(item.displayStatus);
    return matchesAction && matchesStatus;
  });

  const filterButtonStyle = css`
    .euiFilterButton {
      background-color: ${euiTheme.colors.lightestShade};
      border: none;
      border-radius: ${euiTheme.border.radius.medium};
    }
  `;

  const filterButtons = (
    <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup css={filterButtonStyle}>
          <EuiPopover
            button={
              <EuiFilterButton
                iconType="arrowDown"
                onClick={() => setIsActionsFilterOpen(!isActionsFilterOpen)}
                isSelected={isActionsFilterOpen}
                hasActiveFilters={selectedActions.length > 0}
                numActiveFilters={selectedActions.length}
              >
                {i18n.translate('xpack.fleet.epmList.manageIntegrations.actionsFilter', {
                  defaultMessage: 'Actions',
                })}
              </EuiFilterButton>
            }
            isOpen={isActionsFilterOpen}
            closePopover={() => setIsActionsFilterOpen(false)}
            panelPaddingSize="none"
          >
            <EuiSelectable options={actionsOptions} onChange={handleActionsChange}>
              {(list) => <div style={{ width: 200 }}>{list}</div>}
            </EuiSelectable>
          </EuiPopover>
        </EuiFilterGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup css={filterButtonStyle}>
          <EuiPopover
            button={
              <EuiFilterButton
                iconType="arrowDown"
                onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                isSelected={isStatusFilterOpen}
                hasActiveFilters={selectedStatuses.length > 0}
                numActiveFilters={selectedStatuses.length}
              >
                {i18n.translate('xpack.fleet.epmList.manageIntegrations.statusFilter', {
                  defaultMessage: 'Status',
                })}
              </EuiFilterButton>
            }
            isOpen={isStatusFilterOpen}
            closePopover={() => setIsStatusFilterOpen(false)}
            panelPaddingSize="none"
          >
            <EuiSelectable options={statusOptions} onChange={handleStatusChange}>
              {(list) => <div style={{ width: 200 }}>{list}</div>}
            </EuiSelectable>
          </EuiPopover>
        </EuiFilterGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <CreateNewIntegrationButton />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const search: EuiSearchBarProps = {
    box: {
      incremental: true,
      placeholder: 'Search integrations',
    },
    toolsRight: [filterButtons],
  };

  const countText = (
    <>
      <EuiText size="s">
        <FormattedMessage
          id="xpack.fleet.epmList.manageIntegrations.showingCount"
          defaultMessage="Showing {count} integrations"
          values={{ count: filteredIntegrations.length }}
        />
      </EuiText>
      <EuiSpacer size="m" />
    </>
  );

  return (
    <>
      <EuiInMemoryTable
        items={filteredIntegrations}
        columns={columns}
        search={search}
        childrenBetween={countText}
        tableCaption={i18n.translate('xpack.fleet.epmList.manageIntegrations.tableCaption', {
          defaultMessage: 'Manage created integrations',
        })}
        pagination
        sorting
        data-test-subj="manageIntegrationsTable"
      />
    </>
  );
};
