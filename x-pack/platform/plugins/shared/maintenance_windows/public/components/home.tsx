/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { MaintenanceWindowStatus } from '../../common';
import {
  MAINTENANCE_WINDOW_FEATURE_ID,
  MAINTENANCE_WINDOW_DEEP_LINK_IDS,
  MAINTENANCE_WINDOW_DEFAULT_PER_PAGE,
  MAINTENANCE_WINDOW_DEFAULT_TABLE_ACTIVE_PAGE,
} from '../../common';
import { useKibana } from '../utils/kibana_react';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { EmptyPrompt } from './empty_prompt';
import * as i18n from '../translations';
import { useCreateMaintenanceWindowNavigation } from '../hooks/use_navigation';
import { MaintenanceWindowsList } from './maintenance_windows_list';
import { useFindMaintenanceWindows } from '../hooks/use_find_maintenance_windows';
import { useLicense } from '../hooks/use_license';
import { LicensePrompt } from './license_prompt';

export const MaintenanceWindowsPage = React.memo(() => {
  const {
    application: { capabilities },
    chrome,
    docLinks,
  } = useKibana().services;
  const { isAtLeastPlatinum } = useLicense();
  const hasLicense = isAtLeastPlatinum();

  const [page, setPage] = useState<number>(MAINTENANCE_WINDOW_DEFAULT_TABLE_ACTIVE_PAGE);
  const [perPage, setPerPage] = useState<number>(MAINTENANCE_WINDOW_DEFAULT_PER_PAGE);

  const [selectedStatus, setSelectedStatus] = useState<MaintenanceWindowStatus[]>([]);
  const [search, setSearch] = useState<string>('');

  const { navigateToCreateMaintenanceWindow } = useCreateMaintenanceWindowNavigation();

  const { isLoading, isInitialLoading, data, refetch } = useFindMaintenanceWindows({
    enabled: hasLicense,
    page,
    perPage,
    search,
    selectedStatus,
  });

  const { maintenanceWindows, total } = data || { maintenanceWindows: [], total: 0 };

  useBreadcrumbs(MAINTENANCE_WINDOW_DEEP_LINK_IDS.maintenanceWindows);

  const handleClickCreate = useCallback(() => {
    navigateToCreateMaintenanceWindow();
  }, [navigateToCreateMaintenanceWindow]);

  const refreshData = useCallback(() => refetch(), [refetch]);
  const showWindowMaintenance = capabilities[MAINTENANCE_WINDOW_FEATURE_ID]?.show;
  const writeWindowMaintenance = capabilities[MAINTENANCE_WINDOW_FEATURE_ID]?.save;
  const isNotFiltered = search === '' && selectedStatus.length === 0;

  const showEmptyPrompt =
    !isLoading &&
    maintenanceWindows.length === 0 &&
    isNotFiltered &&
    showWindowMaintenance &&
    writeWindowMaintenance;

  const readOnly = showWindowMaintenance && !writeWindowMaintenance;

  // if the user is read only then display the glasses badge in the global navigation header
  const setBadge = useCallback(() => {
    if (readOnly) {
      chrome.setBadge({
        text: i18n.READ_ONLY_BADGE_TEXT,
        tooltip: i18n.READ_ONLY_BADGE_TOOLTIP,
        iconType: 'glasses',
      });
    }
  }, [chrome, readOnly]);

  useEffect(() => {
    setBadge();

    // remove the icon after the component unmounts
    return () => {
      chrome.setBadge();
    };
  }, [setBadge, chrome]);

  const onPageChange = useCallback(
    ({ page: { index, size } }: { page: { index: number; size: number } }) => {
      setPage(index + 1);
      setPerPage(size);
    },
    []
  );

  const onSelectedStatusChange = useCallback((status: MaintenanceWindowStatus[]) => {
    setSelectedStatus(status);
  }, []);

  const onSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  return (
    <>
      <EuiPageHeader bottomBorder alignItems="top">
        <EuiPageHeaderSection>
          <EuiFlexGroup alignItems="baseline" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="l">
                <h1>{i18n.MAINTENANCE_WINDOWS}</h1>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
          <EuiText size="m">
            <p>{i18n.MAINTENANCE_WINDOWS_DESCRIPTION}</p>
          </EuiText>
        </EuiPageHeaderSection>
        {!showEmptyPrompt && hasLicense && writeWindowMaintenance ? (
          <EuiPageHeaderSection>
            <EuiButton
              data-test-subj="mw-create-button"
              onClick={handleClickCreate}
              iconType="plusInCircle"
              fill
            >
              {i18n.CREATE_NEW_BUTTON}
            </EuiButton>
          </EuiPageHeaderSection>
        ) : null}
      </EuiPageHeader>
      {!hasLicense ? (
        <LicensePrompt />
      ) : showEmptyPrompt ? (
        <EmptyPrompt onClickCreate={handleClickCreate} docLinks={docLinks.links} />
      ) : (
        <>
          <EuiSpacer size="xl" />
          <MaintenanceWindowsList
            readOnly={readOnly}
            refreshData={refreshData}
            isLoading={isLoading || isInitialLoading}
            items={maintenanceWindows}
            page={page}
            perPage={perPage}
            total={total}
            onPageChange={onPageChange}
            selectedStatus={selectedStatus}
            onStatusChange={onSelectedStatusChange}
            onSearchChange={onSearchChange}
          />
        </>
      )}
    </>
  );
});

MaintenanceWindowsPage.displayName = 'MaintenanceWindowsPage';
// eslint-disable-next-line import/no-default-export
export { MaintenanceWindowsPage as default };
