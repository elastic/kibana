/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButton,
  EuiEmptyPrompt,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexItem,
  EuiFlexGroup,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiPopover,
  EuiSelectable,
  EuiInMemoryTable,
  EuiText,
  useEuiTheme,
  EuiCallOut,
} from '@elastic/eui';
import type {
  EuiBasicTableColumn,
  EuiSearchBarProps,
  EuiSelectableOption,
  EuiTableSelectionType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useQuery } from '@kbn/react-query';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserAvatar } from '@kbn/user-profile-components';

import { PackageIcon } from '../../../../../../../components/package_icon';

import { useStartServices } from '../../../../../hooks';

import { ManageIntegrationActions } from './manage_integration_actions';
import type { ReviewIntegrationDetails } from './manage_integration_actions';
import { CreateNewIntegrationButton } from './create_new_integration';

export type DataStreamResultsFlyoutComponent = NonNullable<
  ReturnType<typeof useStartServices>['automaticImport']
>['components']['DataStreamResultsFlyout'];
export type DataStreamResponse =
  React.ComponentProps<DataStreamResultsFlyoutComponent>['dataStream'];
export type TaskStatus = DataStreamResponse['status'];
export interface AutomaticImportTelemetry {
  reportEvent(event: string, data: Record<string, unknown>): void;
}

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

const isIntegrationPackageReady = (item: CreatedIntegrationRow): boolean =>
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
  const [isActionsFilterOpen, setIsActionsFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<CreatedIntegrationRow[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkInstalling, setIsBulkInstalling] = useState(false);
  const { euiTheme } = useEuiTheme();
  const {
    application,
    automaticImport,
    http,
    notifications,
    userProfile: userProfileService,
  } = useStartServices();

  const hasReportedView = useRef(false);
  useEffect(() => {
    if (!isLoading && !hasReportedView.current) {
      (automaticImport?.telemetry as AutomaticImportTelemetry)?.reportEvent(
        'automatic_import_manage_integrations_table_viewed',
        {}
      );
      hasReportedView.current = true;
    }
  }, [isLoading, automaticImport]);

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
      let availableAction: string | undefined;
      if (item.status === 'approved') {
        availableAction = 'approved';
      } else if (isIntegrationPackageReady(item)) {
        availableAction = 'review_approve';
      }
      return {
        ...item,
        displayStatus,
        availableAction,
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

  const goToEditIntegration = useCallback(
    (integrationId: string) => {
      application.navigateToApp('automaticImport', {
        path: `/edit/${integrationId}`,
      });
    },
    [application]
  );

  const getEditIntegrationHref = useCallback(
    (integrationId: string) =>
      application.getUrlForApp('automaticImport', {
        path: `/edit/${integrationId}`,
      }),
    [application]
  );

  const deleteIntegration = useCallback(
    async (integrationId: string) => {
      try {
        await http.delete(
          `/api/automatic_import/integrations/${encodeURIComponent(integrationId)}`,
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
      }>(`/api/automatic_import/integrations/${encodeURIComponent(integrationId)}`, {
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

  const downloadZipPackage = useCallback(
    async (integrationId: string) => {
      try {
        const response = await http.get(
          `/api/automatic_import/integrations/${encodeURIComponent(integrationId)}/download`,
          {
            version: '1',
            headers: { Accept: 'application/zip' },
            asResponse: true,
          }
        );
        const contentDisposition = response.response?.headers?.get('content-disposition') ?? '';
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        const filename = filenameMatch?.[1] ?? `${integrationId}.zip`;

        const blob = response.body as unknown as Blob;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        (automaticImport?.telemetry as AutomaticImportTelemetry)?.reportEvent(
          'automatic_import_integration_download_zip_clicked',
          {}
        );
      } catch (error) {
        notifications.toasts.addError(error as Error, {
          title: i18n.translate(
            'xpack.fleet.epmList.manageIntegrations.actions.downloadZipErrorTitle',
            { defaultMessage: 'Failed to download .zip package' }
          ),
        });
      }
    },
    [http, notifications, automaticImport]
  );

  const approveAndDeployIntegration = useCallback(
    async (integrationId: string, version: string, categories: string[]) => {
      try {
        await http.post(
          `/api/automatic_import/integrations/${encodeURIComponent(integrationId)}/approve`,
          {
            version: '1',
            body: JSON.stringify({ version, categories }),
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

  const installToCluster = useCallback(
    async (integrationId: string) => {
      try {
        const zipBlob = await http.get(
          `/api/automatic_import/integrations/${encodeURIComponent(integrationId)}/download`,
          {
            version: '1',
            headers: { Accept: 'application/zip' },
          }
        );

        await http.post('/api/fleet/epm/packages', {
          headers: {
            'Elastic-Api-Version': '2023-10-31',
            'Content-Type': 'application/zip',
          },
          body: zipBlob as unknown as BodyInit,
        });

        notifications.toasts.addSuccess({
          title: i18n.translate(
            'xpack.fleet.epmList.manageIntegrations.actions.installSuccessTitle',
            { defaultMessage: 'Integration installed to cluster successfully' }
          ),
        });
      } catch (error) {
        notifications.toasts.addError(error as Error, {
          title: i18n.translate(
            'xpack.fleet.epmList.manageIntegrations.actions.installErrorTitle',
            { defaultMessage: 'Failed to install integration to cluster' }
          ),
        });
      }
    },
    [http, notifications]
  );

  const selection: EuiTableSelectionType<CreatedIntegrationRow> = useMemo(
    () => ({
      onSelectionChange: (items: CreatedIntegrationRow[]) => setSelectedItems(items),
    }),
    []
  );

  const handleBulkDelete = useCallback(async () => {
    setIsBulkDeleting(true);
    try {
      await Promise.all(selectedItems.map((item) => deleteIntegration(item.integrationId)));
      setSelectedItems([]);
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedItems, deleteIntegration]);

  const handleBulkInstall = useCallback(async () => {
    const approvedItems = selectedItems.filter((item) => item.status === 'approved');
    setIsBulkInstalling(true);
    try {
      await Promise.all(approvedItems.map((item) => installToCluster(item.integrationId)));
      setSelectedItems([]);
    } finally {
      setIsBulkInstalling(false);
    }
  }, [selectedItems, installToCluster]);

  const hasApprovedSelected = selectedItems.some((item) => item.status === 'approved');

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
        width: '22%',
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
        width: '12%',
      },
      {
        field: 'version',
        name: (
          <FormattedMessage
            id="xpack.fleet.epmList.manageIntegrations.table.version"
            defaultMessage="Version"
          />
        ),
        width: '10%',
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
        width: '16%',
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
            defaultMessage="Analysing Status"
          />
        ),
        render: (status: TaskStatus) => {
          const { color, iconType, label, isInProgress } = getStatusDisplay(status);
          const badgeStyle = {
            borderRadius: '999px',
            paddingLeft: euiTheme.size.s,
            paddingRight: euiTheme.size.s,
            gap: '2px',
            fontFamily: euiTheme.font.family,
            fontWeight: euiTheme.font.weight.medium,
            fontSize: euiTheme.size.m,
          };
          if (isInProgress) {
            return (
              <EuiBadge
                color={color}
                style={{
                  ...badgeStyle,
                  backgroundColor: euiTheme.colors.backgroundLightText,
                }}
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
            <EuiBadge color={color} iconType={iconType} style={badgeStyle}>
              {label}
            </EuiBadge>
          );
        },
        width: '14%',
      },
      {
        name: (
          <FormattedMessage
            id="xpack.fleet.epmList.manageIntegrations.table.approvalStatus"
            defaultMessage="Approval Status"
          />
        ),
        width: '18%',
        render: (item: CreatedIntegrationRow) => {
          if (item.status === 'approved') {
            return (
              <EuiBadge
                color="hollow"
                iconType="check"
                style={{
                  color: euiTheme.colors.textParagraph,
                  borderRadius: '999px',
                  border: `1px solid ${euiTheme.colors.borderBasePlain}`,
                  paddingLeft: euiTheme.size.s,
                  paddingRight: euiTheme.size.s,
                  gap: '2px',
                  fontFamily: euiTheme.font.family,
                  fontWeight: euiTheme.font.weight.medium,
                  fontSize: euiTheme.size.m,
                }}
              >
                <FormattedMessage
                  id="xpack.fleet.epmList.manageIntegrations.status.approved"
                  defaultMessage="Approved"
                />
              </EuiBadge>
            );
          }

          if (isIntegrationPackageReady(item)) {
            return (
              <ManageIntegrationActions
                integration={item}
                isPackageReady={true}
                inlineActionType="reviewApprove"
                showMenuButton={false}
                onEdit={goToEditIntegration}
                onDelete={deleteIntegration}
                DataStreamResultsFlyoutComponent={
                  automaticImport?.components.DataStreamResultsFlyout
                }
                onFetchReviewDetails={fetchIntegrationReviewDetails}
                onApproveAndDeploy={approveAndDeployIntegration}
                onDownloadZip={downloadZipPackage}
                onInstallToCluster={installToCluster}
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
        width: '8%',
        render: (item: CreatedIntegrationRow) => (
          <ManageIntegrationActions
            integration={item}
            isPackageReady={isIntegrationPackageReady(item)}
            onEdit={goToEditIntegration}
            onDelete={deleteIntegration}
            DataStreamResultsFlyoutComponent={automaticImport?.components.DataStreamResultsFlyout}
            onFetchReviewDetails={fetchIntegrationReviewDetails}
            onApproveAndDeploy={approveAndDeployIntegration}
            onDownloadZip={downloadZipPackage}
            onInstallToCluster={installToCluster}
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
      downloadZipPackage,
      installToCluster,
      automaticImport?.components.DataStreamResultsFlyout,
      euiTheme.colors.backgroundLightText,
      euiTheme.colors.textParagraph,
      euiTheme.colors.borderBasePlain,
      euiTheme.font.family,
      euiTheme.font.weight.medium,
      euiTheme.size.s,
      euiTheme.size.m,
      userProfiles,
    ]
  );
  const actionsOptions: EuiSelectableOption[] = [
    {
      label: 'Review & Approve',
      key: 'review_approve',
      checked: selectedActions.includes('review_approve') ? 'on' : undefined,
    },
    {
      label: 'Approved',
      key: 'approved',
      checked: selectedActions.includes('approved') ? 'on' : undefined,
    },
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
      selectedActions.length === 0 ||
      (item.availableAction !== undefined && selectedActions.includes(item.availableAction));
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
            aria-label={i18n.translate(
              'xpack.fleet.epmList.manageIntegrations.actionsFilterPopover',
              { defaultMessage: 'Filter by actions' }
            )}
            button={
              <EuiFilterButton
                iconType="arrowDown"
                data-test-subj="manageIntegrationsActionsFilterBtn"
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
            aria-label={i18n.translate(
              'xpack.fleet.epmList.manageIntegrations.statusFilterPopover',
              { defaultMessage: 'Filter by status' }
            )}
            button={
              <EuiFilterButton
                iconType="arrowDown"
                data-test-subj="manageIntegrationsStatusFilterBtn"
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
    toolsRight: [
      <React.Fragment key="manageIntegrationsSearchTools">{filterButtons}</React.Fragment>,
    ],
  };

  const countText = (
    <>
      {selectedItems.length > 0 ? (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <FormattedMessage
                id="xpack.fleet.epmList.manageIntegrations.selectedCount"
                defaultMessage="{count} selected"
                values={{ count: selectedItems.length }}
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              color="danger"
              iconType="trash"
              isLoading={isBulkDeleting}
              onClick={handleBulkDelete}
              data-test-subj="manageIntegrationsBulkDeleteBtn"
            >
              <FormattedMessage
                id="xpack.fleet.epmList.manageIntegrations.bulkDelete"
                defaultMessage="Delete"
              />
            </EuiButton>
          </EuiFlexItem>
          {hasApprovedSelected && (
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                iconType="exportAction"
                isLoading={isBulkInstalling}
                onClick={handleBulkInstall}
                data-test-subj="manageIntegrationsBulkInstallBtn"
              >
                <FormattedMessage
                  id="xpack.fleet.epmList.manageIntegrations.bulkInstall"
                  defaultMessage="Install"
                />
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ) : (
        <EuiText size="s">
          <FormattedMessage
            id="xpack.fleet.epmList.manageIntegrations.showingCount"
            defaultMessage="Showing {count} integrations"
            values={{ count: filteredIntegrations.length }}
          />
        </EuiText>
      )}
      <EuiSpacer size="m" />
    </>
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
        data-test-subj="manageIntegrationsTableError"
      />
    );
  }

  return (
    <>
      <EuiInMemoryTable
        items={filteredIntegrations}
        itemId="integrationId"
        columns={columns}
        search={search}
        childrenBetween={countText}
        selection={selection}
        tableCaption={i18n.translate('xpack.fleet.epmList.manageIntegrations.tableCaption', {
          defaultMessage: 'Manage created integrations',
        })}
        pagination
        sorting
        data-test-subj="manageIntegrationsTable"
        tableLayout="fixed"
      />
    </>
  );
};
