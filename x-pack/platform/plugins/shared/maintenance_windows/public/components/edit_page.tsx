/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { EuiPageSection, EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import { SectionLoading } from '@kbn/es-ui-shared-plugin/public';

import { MAINTENANCE_WINDOW_DEEP_LINK_IDS } from '../../common';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { useMaintenanceWindowsNavigation } from '../hooks/use_navigation';
import { useKibana } from '../utils/kibana_react';
import * as i18n from '../translations';
import { CreateMaintenanceWindowForm } from './create_maintenance_windows_form';
import { useGetMaintenanceWindow } from '../hooks/use_get_maintenance_window';

export const MaintenanceWindowsEditPage = React.memo(() => {
  const { docLinks } = useKibana().services;
  const { navigateToMaintenanceWindows, getMaintenanceWindowsUrl } =
    useMaintenanceWindowsNavigation();

  useBreadcrumbs(MAINTENANCE_WINDOW_DEEP_LINK_IDS.maintenanceWindowsEdit);

  const { maintenanceWindowId } = useParams<{ maintenanceWindowId: string }>();
  const { maintenanceWindow, showMultipleSolutionsWarning, isLoading, isError } =
    useGetMaintenanceWindow(maintenanceWindowId);

  if (isError) {
    navigateToMaintenanceWindows();
  }

  const header = (
    <>
      <AppHeader
        title={i18n.EDIT_MAINTENANCE_WINDOW}
        back={{
          href: getMaintenanceWindowsUrl(),
          label: i18n.MAINTENANCE_WINDOWS,
        }}
        docLink={docLinks.links.alerting.maintenanceWindows}
        spacing="bleed"
      />
      <EuiSpacer size="l" />
    </>
  );

  if (!maintenanceWindow || isLoading) {
    return (
      <>
        {header}
        <EuiPageSection alignment="center" color="subdued">
          <SectionLoading inline data-test-subj="sectionLoading">
            {i18n.LOADING_MAINTENANCE_WINDOW}
          </SectionLoading>
        </EuiPageSection>
      </>
    );
  }

  return (
    <>
      {header}
      <EuiPageSection restrictWidth>
        <CreateMaintenanceWindowForm
          initialValue={maintenanceWindow}
          maintenanceWindowId={maintenanceWindowId}
          showMultipleSolutionsWarning={showMultipleSolutionsWarning}
          onCancel={navigateToMaintenanceWindows}
          onSuccess={navigateToMaintenanceWindows}
        />
      </EuiPageSection>
    </>
  );
});
MaintenanceWindowsEditPage.displayName = 'MaintenanceWindowsEditPage';
// eslint-disable-next-line import/no-default-export
export { MaintenanceWindowsEditPage as default };
