/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiPage, EuiPageBody, EuiPageSection } from '@elastic/eui';

import { containerCss, wrapperCss } from './layouts/default';
import { OsqueryAppRoutes } from '../routes';
import { useOsqueryIntegrationStatus } from '../common/hooks';
import { OsqueryAppEmptyState } from './empty_state';
import { MainNavigation } from './main_navigation';
import { OsqueryPageHeaderProvider } from './osquery_page_header_context';

const OsqueryAppComponent = () => {
  const { data: osqueryIntegration, isFetched } = useOsqueryIntegrationStatus();
  if (!isFetched) {
    return (
      <EuiPage paddingSize="none">
        <EuiPageBody>
          <EuiPageSection paddingSize="none" color="subdued">
            {/* POC: EuiLoadingElastic → EuiLoadingSpinner (branded fork no longer needed) */}
            <EuiLoadingSpinner size="xxl" />
          </EuiPageSection>
        </EuiPageBody>
      </EuiPage>
    );
  }

  if (isFetched && osqueryIntegration?.install_status !== 'installed') {
    return <OsqueryAppEmptyState />;
  }

  return (
    <div css={containerCss} id="osquery-app">
      <div css={wrapperCss}>
        <OsqueryPageHeaderProvider>
          <MainNavigation />
          <OsqueryAppRoutes />
        </OsqueryPageHeaderProvider>
      </div>
    </div>
  );
};

export const OsqueryApp = React.memo(OsqueryAppComponent);
