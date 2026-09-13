/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageSection, EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';

import { MAINTENANCE_WINDOW_DEEP_LINK_IDS } from '../../common';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { useMaintenanceWindowsNavigation } from '../hooks/use_navigation';
import { useKibana } from '../utils/kibana_react';
import * as i18n from '../translations';
import { CreateMaintenanceWindowForm } from './create_maintenance_windows_form';

export const MaintenanceWindowsCreate = React.memo(() => {
  useBreadcrumbs(MAINTENANCE_WINDOW_DEEP_LINK_IDS.maintenanceWindowsCreate);
  const { docLinks } = useKibana().services;
  const { navigateToMaintenanceWindows, getMaintenanceWindowsUrl } =
    useMaintenanceWindowsNavigation();

  return (
    <>
      <AppHeader
        title={i18n.CREATE_MAINTENANCE_WINDOW}
        description={i18n.CREATE_MAINTENANCE_WINDOW_DESCRIPTION}
        back={{
          href: getMaintenanceWindowsUrl(),
          label: i18n.MAINTENANCE_WINDOWS,
        }}
        docLink={docLinks.links.alerting.maintenanceWindows}
        spacing="bleed"
      />
      <EuiSpacer size="l" />
      <EuiPageSection restrictWidth>
        <CreateMaintenanceWindowForm
          onCancel={navigateToMaintenanceWindows}
          onSuccess={navigateToMaintenanceWindows}
        />
      </EuiPageSection>
    </>
  );
});
MaintenanceWindowsCreate.displayName = 'MaintenanceWindowsCreate';
// eslint-disable-next-line import/no-default-export
export { MaintenanceWindowsCreate as default };
