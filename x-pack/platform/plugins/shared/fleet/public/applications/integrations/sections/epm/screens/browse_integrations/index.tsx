/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexItem,
  EuiFlexGroup,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPopover,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useHistory, useLocation } from 'react-router-dom';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserAvatar } from '@kbn/user-profile-components';

import { useBreadcrumbs, useLink, useStartServices } from '../../../../hooks';
import { NoEprCallout } from '../../components/no_epr_callout';
import { categoryExists } from '../home';

import { ResponsivePackageGrid } from './components/responsive_package_grid';
import { SearchAndFiltersBar, StickyFlexItem } from './components/search_and_filters_bar';
import { Sidebar } from './components/side_bar';
import { useBrowseIntegrationHook } from './hooks';
import { NoDataPrompt } from './components/no_data_prompt';

const CreateNewIntegrationButton: React.FC = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { getAbsolutePath } = useLink();
  const history = useHistory();

  const uploadHref = getAbsolutePath('/app/integrations/upload');

  const onCreateClick = useCallback(() => {
    history.push('/create');
  }, [history]);

  const onUploadClick = useCallback(() => {
    setIsPopoverOpen(false);
    history.push('/upload');
  }, [history]);

  return (
    <EuiFlexGroup gutterSize="none" responsive={false} alignItems="stretch">
      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          size="s"
          iconType="plusInCircle"
          onClick={() => onCreateClick()}
          style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
          data-test-subj="createNewIntegrationBtn"
        >
          {i18n.translate('xpack.fleet.epmList.createNewIntegrationButton', {
            defaultMessage: 'Create new integration',
          })}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ display: 'flex' }}>
        <EuiPopover
          isOpen={isPopoverOpen}
          closePopover={() => setIsPopoverOpen(false)}
          panelPaddingSize="none"
          anchorPosition="downRight"
          style={{ display: 'flex', height: '100%' }}
          button={
            <EuiButtonIcon
              display="fill"
              color="primary"
              iconType="arrowDown"
              aria-label={i18n.translate(
                'xpack.fleet.epmList.createNewIntegrationDropdownAriaLabel',
                { defaultMessage: 'More integration creation options' }
              )}
              onClick={() => setIsPopoverOpen((prev) => !prev)}
              style={{
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
                borderLeft: '1px solid rgba(255,255,255,0.3)',
                height: '100%',
                minHeight: 0,
              }}
              data-test-subj="createNewIntegrationDropdownBtn"
            />
          }
        >
          <EuiContextMenuPanel
            items={[
              <EuiContextMenuItem
                key="upload"
                icon="exportAction"
                href={uploadHref}
                onClick={(ev) => {
                  ev.preventDefault();
                  onUploadClick();
                }}
                data-test-subj="uploadIntegrationPackageBtn"
              >
                {i18n.translate('xpack.fleet.epmList.uploadIntegrationPackageButton', {
                  defaultMessage: 'Upload integration package',
                })}
              </EuiContextMenuItem>,
            ]}
          />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const BrowseIntegrationsPage: React.FC<{ prereleaseIntegrationsEnabled: boolean }> = ({
  prereleaseIntegrationsEnabled,
}) => {
  useBreadcrumbs('integrations_all');

  const { automaticImportVTwo } = useStartServices();
  const { pathname, search } = useLocation();
  const history = useHistory();
  const euiTheme = useEuiTheme();

  const useGetAllIntegrationsHook =
    automaticImportVTwo?.hooks.useGetAllIntegrations ?? useEmptyAllIntegrations;
  const {
    integrations,
    isLoading: isLoadingCreatedIntegrations,
    isError: isCreatedIntegrationsError,
  } = useGetAllIntegrationsHook();
  const hasCreatedIntegrations = integrations.length > 0;
  const isManageIntegrationsView = useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get('view') === 'manage';
  }, [search]);

  const manageIntegrationsHref = useMemo(() => {
    const params = new URLSearchParams(search);
    params.set('view', 'manage');
    return `${pathname}?${params.toString()}`;
  }, [pathname, search]);
  const onManageIntegrationsClick = useCallback(
    (ev: React.MouseEvent<HTMLAnchorElement>) => {
      ev.preventDefault();
      history.push(manageIntegrationsHref);
    },
    [history, manageIntegrationsHref]
  );

  const {
    allCategories,
    initialSelectedCategory,
    selectedCategory,
    mainCategories,
    onlyAgentlessFilter,
    isLoading,
    isLoadingCategories,
    isLoadingAllPackages,
    isLoadingAppendCustomIntegrations,
    eprPackageLoadingError,
    eprCategoryLoadingError,
    setUrlandReplaceHistory,
    filteredCards,
    onCategoryChange,
  } = useBrowseIntegrationHook({ prereleaseIntegrationsEnabled });

  if (!isLoading && !categoryExists(initialSelectedCategory, allCategories)) {
    setUrlandReplaceHistory({
      searchString: '',
      categoryId: '',
      subCategoryId: '',
      onlyAgentless: onlyAgentlessFilter,
    });
    return null;
  }

  let noEprCallout;
  if (eprPackageLoadingError || eprCategoryLoadingError) {
    const error = eprPackageLoadingError || eprCategoryLoadingError;
    noEprCallout = (
      <EuiFlexItem grow={1}>
        <NoEprCallout statusCode={error?.statusCode} />
        <EuiSpacer size="s" />
      </EuiFlexItem>
    );
  }

  return (
    <EuiFlexGroup
      justifyContent="flexEnd"
      alignItems="flexStart"
      gutterSize="none"
      data-test-subj="epmList.integrationCards"
    >
      <Sidebar
        isLoading={isLoading}
        categories={mainCategories}
        selectedCategory={selectedCategory}
        onCategoryChange={onCategoryChange}
        CreateIntegrationCardButton={
          automaticImportVTwo?.components.CreateIntegrationSideCardButton
        }
        hasCreatedIntegrations={hasCreatedIntegrations}
        onManageIntegrationsClick={onManageIntegrationsClick}
      />
      <EuiFlexItem grow={5}>
        <EuiFlexGroup direction="column" gutterSize="none">
          {isManageIntegrationsView ? (
            <StickyFlexItem>
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow>
                  <EuiFieldSearch
                    compressed
                    placeholder={i18n.translate(
                      'xpack.fleet.epmList.manageIntegrations.searchPlaceholder',
                      { defaultMessage: 'Search integrations' }
                    )}
                    fullWidth
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <CreateNewIntegrationButton />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
            </StickyFlexItem>
          ) : (
            <SearchAndFiltersBar />
          )}
          {noEprCallout ? noEprCallout : null}
          <EuiFlexItem
            grow={1}
            data-test-subj="epmList.mainColumn"
            style={{
              position: 'relative',
              backgroundColor: euiTheme.euiTheme.colors.backgroundBasePlain,
            }}
          >
            {isManageIntegrationsView ? (
              <ManageIntegrationsTable
                integrations={integrations}
                isLoading={isLoadingCreatedIntegrations}
                isError={isCreatedIntegrationsError}
              />
            ) : filteredCards.length === 0 && !isLoading ? (
              <NoDataPrompt />
            ) : (
              <ResponsivePackageGrid
                items={filteredCards}
                isLoading={
                  isLoadingCategories || isLoadingAllPackages || isLoadingAppendCustomIntegrations
                }
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

function useEmptyAllIntegrations() {
  return {
    integrations: [] as CreatedIntegrationRow[],
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => {},
  };
}

interface CreatedIntegrationRow {
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

const ManageIntegrationsTable: React.FC<{
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
