/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useInternalApiClient, useKibana } from '@kbn/reporting-public';
import { ListingProps } from '.';
import { IlmPolicyLink, MigrateIlmPolicyCallOut, ReportDiagnostic } from './components';
import { ReportExportsTable } from './report_exports_table';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { useIlmPolicyStatus } from '../lib/ilm_policy_status_context';

export const ReportListing = (props: ListingProps) => {
  console.log('Inside report listing', { props });
  const { apiClient } = useInternalApiClient();
  const {
    services: {
      application: { capabilities },
    },
  } = useKibana();

  const { config, navigateToUrl, toasts, urlService, ...listingProps } = props;
  const ilmLocator = urlService.locators.get('ILM_LOCATOR_ID');
  const ilmPolicyContextValue = useIlmPolicyStatus();
  const hasIlmPolicy = ilmPolicyContextValue?.status !== 'policy-not-found';
  const showIlmPolicyLink = Boolean(ilmLocator && hasIlmPolicy);
  return (
    <>
      {props.config.statefulSettings.enabled ? <MigrateIlmPolicyCallOut toasts={toasts} /> : null}

      <EuiSpacer size={'l'} />

      <ReportExportsTable
        {...listingProps}
        apiClient={apiClient}
        capabilities={capabilities}
        config={config}
        toasts={toasts}
        navigateToUrl={navigateToUrl}
        urlService={urlService}
      />

      {props.config.statefulSettings.enabled ? (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup justifyContent="flexEnd">
            {capabilities?.management?.data?.index_lifecycle_management && (
              <EuiFlexItem grow={false}>
                {ilmPolicyContextValue?.isLoading ? (
                  <EuiLoadingSpinner />
                ) : (
                  showIlmPolicyLink && (
                    <IlmPolicyLink navigateToUrl={navigateToUrl} locator={ilmLocator!} />
                  )
                )}
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <ReportDiagnostic clientConfig={config} apiClient={apiClient} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : null}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ReportListing as default };
