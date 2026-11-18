/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { ImportsTable } from '../../components/imports/imports_table';
import { useFetchImports } from '../../hooks/use_fetch_imports';

const IMPORTS_PAGE_TITLE = i18n.translate('xpack.alertingV2.imports.pageTitle', {
  defaultMessage: 'Import alerts',
});

/** Lists the alert imports of the current space. Listing them reads connectors, so that access is required. */
export const ImportsPage = () => {
  useBreadcrumbs('imports_list');
  const { capabilities } = useService(CoreStart('application'));
  const canReadConnectors = capabilities.actions?.show === true;
  const { data: imports = [], isLoading, error } = useFetchImports({ enabled: canReadConnectors });

  if (!canReadConnectors) {
    return (
      <EuiEmptyPrompt
        data-test-subj="alertingV2ImportsConnectorsPrivilegesPrompt"
        iconType="lock"
        color="subdued"
        title={
          <h2>
            {i18n.translate('xpack.alertingV2.imports.connectorsPrivilegesTitle', {
              defaultMessage: 'Privileges required',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.alertingV2.imports.connectorsPrivilegesBody', {
              defaultMessage:
                'To view Import alerts, you need read access to Actions and Connectors. Contact your administrator to request access.',
            })}
          </p>
        }
      />
    );
  }

  return (
    <div data-test-subj="alertingV2ImportsPage">
      <AppHeader sticky={false} title={IMPORTS_PAGE_TITLE} spacing="bleed" />
      <EuiSpacer size="m" />
      <ImportsTable items={imports} isLoading={isLoading} error={error} />
    </div>
  );
};
