/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { EuiPageSection, EuiSpacer } from '@elastic/eui';

import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useMaintenanceWindowsNavigation } from '../../hooks/use_navigation';
import * as i18n from './translations';
import { PageHeader } from './components/page_header';
import { CreateMaintenanceWindowForm } from './components/create_maintenance_windows_form';
import { MAINTENANCE_WINDOW_DEEP_LINK_IDS } from '../../../common';
import { useGetMaintenanceWindow } from '../../hooks/use_get_maintenance_window';
import { CenterJustifiedSpinner } from './components/center_justified_spinner';

export const MaintenanceWindowsEditPage = React.memo(() => {
  const { navigateToMaintenanceWindows } = useMaintenanceWindowsNavigation();

  useBreadcrumbs(MAINTENANCE_WINDOW_DEEP_LINK_IDS.maintenanceWindowsEdit);

  const { maintenanceWindowId } = useParams<{ maintenanceWindowId: string }>();
  const { maintenanceWindow, isLoading, isError } = useGetMaintenanceWindow(maintenanceWindowId);

  if (isError) {
    navigateToMaintenanceWindows();
  }

  if (!maintenanceWindow || isLoading) {
    return <CenterJustifiedSpinner />;
  }

  return (
    <EuiPageSection restrictWidth={true}>
      <PageHeader showBackButton={true} title={i18n.EDIT_MAINTENANCE_WINDOW} />
      <EuiSpacer size="xl" />
      <CreateMaintenanceWindowForm
        initialValue={maintenanceWindow}
        maintenanceWindowId={maintenanceWindowId}
        onCancel={navigateToMaintenanceWindows}
        onSuccess={navigateToMaintenanceWindows}
      />
    </EuiPageSection>
  );
});
MaintenanceWindowsEditPage.displayName = 'MaintenanceWindowsEditPage';
// eslint-disable-next-line import/no-default-export
export { MaintenanceWindowsEditPage as default };
