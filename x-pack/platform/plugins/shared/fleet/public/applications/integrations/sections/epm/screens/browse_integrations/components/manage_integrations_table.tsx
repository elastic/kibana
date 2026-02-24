/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexItem,
  EuiFlexGroup,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useQuery } from '@kbn/react-query';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserAvatar } from '@kbn/user-profile-components';

import { PackageIcon } from '../../../../../../../components/package_icon';

import { useStartServices } from '../../../../../hooks';

export interface CreatedIntegrationRow {
  integrationId: string;
  title: string;
  logo?: string;
  totalDataStreamCount: number;
  successfulDataStreamCount: number;
  version?: string;
  createdBy: string;
  createdByProfileUid?: string;
  status: string;
}

function getStatusDisplay(status: string): {
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
}> = ({ integrations, isLoading, isError }) => {
  const { application, userProfile: userProfileService } = useStartServices();

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
              <EuiLink
                href={application.getUrlForApp('automaticImportVTwo', {
                  path: `/edit/${item.integrationId}`,
                })}
              >
                {title}
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        name: (
          <FormattedMessage
            id="xpack.fleet.epmList.manageIntegrations.table.dataStreams"
            defaultMessage="Data streams"
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
        render: (status: string) => {
          const { color, iconType, label, isInProgress } = getStatusDisplay(status);
          if (isInProgress) {
            return (
              <EuiBadge color={color}>
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
    ],
    [application, userProfiles]
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

  return (
    <>
      <EuiText size="s">
        <FormattedMessage
          id="xpack.fleet.epmList.manageIntegrations.showingCount"
          defaultMessage="Showing {count} integrations"
          values={{ count: integrations.length }}
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiBasicTable
        items={integrations}
        columns={columns}
        tableCaption={i18n.translate('xpack.fleet.epmList.manageIntegrations.tableCaption', {
          defaultMessage: 'Manage created integrations',
        })}
        data-test-subj="manageIntegrationsTable"
      />
    </>
  );
};
