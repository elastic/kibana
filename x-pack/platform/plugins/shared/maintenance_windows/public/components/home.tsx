/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';
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
    docLinks,
  } = useKibana().services;
  const { isAtLeastPlatinum } = useLicense();
  const hasLicense = isAtLeastPlatinum();

  const [page, setPage] = useState<number>(MAINTENANCE_WINDOW_DEFAULT_TABLE_ACTIVE_PAGE);
  const [perPage, setPerPage] = useState<number>(MAINTENANCE_WINDOW_DEFAULT_PER_PAGE);

  const [selectedStatus, setSelectedStatus] = useState<MaintenanceWindowStatus[]>([]);
  const [search, setSearch] = useState<string>('');

  const { navigateToCreateMaintenanceWindow, getCreateMaintenanceWindowUrl } =
    useCreateMaintenanceWindowNavigation();

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
  const showCreateInHeader = !showEmptyPrompt && hasLicense && writeWindowMaintenance;

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

  const menu = useMemo<AppHeaderMenu | undefined>(() => {
    if (!showCreateInHeader) {
      return undefined;
    }

    return {
      primaryActionItem: {
        id: 'createMaintenanceWindow',
        label: i18n.CREATE_NEW_BUTTON,
        iconType: 'plusCircle',
        testId: 'mw-create-button',
        href: getCreateMaintenanceWindowUrl(),
        run: handleClickCreate,
      },
    };
  }, [getCreateMaintenanceWindowUrl, handleClickCreate, showCreateInHeader]);

  const badges = useMemo(
    () =>
      readOnly
        ? [
            {
              label: i18n.READ_ONLY_BADGE_TEXT,
              tooltip: i18n.READ_ONLY_BADGE_TOOLTIP,
              color: 'hollow' as const,
              'data-test-subj': 'mw-read-only-badge',
            },
          ]
        : undefined,
    [readOnly]
  );

  return (
    <>
      <AppHeader
        title={i18n.MAINTENANCE_WINDOWS}
        description={i18n.MAINTENANCE_WINDOWS_DESCRIPTION}
        badges={badges}
        menu={menu}
        docLink={docLinks.links.alerting.maintenanceWindows}
        spacing="bleed"
      />
      <EuiSpacer size="l" />
      {!hasLicense ? (
        <LicensePrompt />
      ) : showEmptyPrompt ? (
        <EmptyPrompt onClickCreate={handleClickCreate} docLinks={docLinks.links} />
      ) : (
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
      )}
    </>
  );
});

MaintenanceWindowsPage.displayName = 'MaintenanceWindowsPage';
// eslint-disable-next-line import/no-default-export
export { MaintenanceWindowsPage as default };
