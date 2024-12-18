/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageSection, EuiSpacer } from '@elastic/eui';

import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useMaintenanceWindowsNavigation } from '../../hooks/use_navigation';
import * as i18n from './translations';
import { PageHeader } from './components/page_header';
import { CreateMaintenanceWindowForm } from './components/create_maintenance_windows_form';
import { MAINTENANCE_WINDOW_DEEP_LINK_IDS } from '../../../common';

export const MaintenanceWindowsCreatePage = React.memo(() => {
  useBreadcrumbs(MAINTENANCE_WINDOW_DEEP_LINK_IDS.maintenanceWindowsCreate);
  const { navigateToMaintenanceWindows } = useMaintenanceWindowsNavigation();

  return (
    <EuiPageSection restrictWidth={true}>
      <PageHeader
        showBackButton={true}
        title={i18n.CREATE_MAINTENANCE_WINDOW}
        description={i18n.CREATE_MAINTENANCE_WINDOW_DESCRIPTION}
      />
      <EuiSpacer size="xl" />
      <CreateMaintenanceWindowForm
        onCancel={navigateToMaintenanceWindows}
        onSuccess={navigateToMaintenanceWindows}
      />
    </EuiPageSection>
  );
});
MaintenanceWindowsCreatePage.displayName = 'MaintenanceWindowsCreatePage';
// eslint-disable-next-line import/no-default-export
export { MaintenanceWindowsCreatePage as default };
