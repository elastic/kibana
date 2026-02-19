/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexItem,
  EuiFlexGroup,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserAvatar } from '@kbn/user-profile-components';

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
  const [userProfiles, setUserProfiles] = useState<Map<string, UserProfileWithAvatar>>(new Map());

  useEffect(() => {
    const profileUids = integrations
      .map((i) => i.createdByProfileUid)
      .filter((uid): uid is string => !!uid);
    const uniqueUids = [...new Set(profileUids)];

    if (uniqueUids.length === 0) {
      return;
    }

    userProfileService
      .bulkGet<{ avatar: { initials?: string; color?: string; imageUrl?: string | null } }>({
        uids: new Set(uniqueUids),
        dataPath: 'avatar',
      })
      .then((profiles) => {
        const profileMap = new Map<string, UserProfileWithAvatar>();
        for (const profile of profiles) {
          profileMap.set(profile.uid, profile as UserProfileWithAvatar);
        }
        setUserProfiles(profileMap);
      })
      .catch(() => {
        // Gracefully degrade — show username only if profile fetch fails
      });
  }, [integrations, userProfileService]);

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
            {item.logo ? (
              <EuiFlexItem grow={false}>
                <img src={`data:image/svg+xml;base64,${item.logo}`} alt="" width={24} height={24} />
              </EuiFlexItem>
            ) : (
              <EuiFlexItem grow={false}>
                <EuiIcon type="package" size="m" aria-hidden={true} />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiLink
                onClick={() => {
                  application.navigateToApp('automaticImportVTwo', {
                    path: `/edit/${item.integrationId}`,
                  });
                }}
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
        tableCaption="Manage created integrations"
        data-test-subj="manageIntegrationsTable"
      />
    </>
  );
};
