/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageHeader,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { ListingPropsInternal } from '..';
import { useIlmPolicyStatus } from '../../lib/ilm_policy_status_context';
import { IlmPolicyLink, MigrateIlmPolicyCallOut, ReportDiagnostic } from '../components';
import { ReportListingTable } from '../report_listing_table';
import { ScheduledReportFlyout } from '../components/scheduled_report_flyout';

const formats = [
  {
    id: 'printablePdfV2',
    label: 'PDF',
  },
  {
    id: 'pngV2',
    label: 'PNG',
  },
  {
    id: 'csv_searchsource',
    label: 'CSV',
  },
];

/**
 * Used in Stateful deployments only
 * Renders controls for ILM and Screenshotting Diagnostics which are only applicable in Stateful
 */
export const ReportListingStateful: FC<ListingPropsInternal> = (props) => {
  const { apiClient, capabilities, config, navigateToUrl, toasts, urlService, ...listingProps } =
    props;
  const ilmLocator = urlService.locators.get('ILM_LOCATOR_ID');
  const ilmPolicyContextValue = useIlmPolicyStatus();
  const hasIlmPolicy = ilmPolicyContextValue?.status !== 'policy-not-found';
  const showIlmPolicyLink = Boolean(ilmLocator && hasIlmPolicy);
  const [scheduledReportFlyoutOpen, setScheduledReportFlyoutOpen] = useState(false);

  return (
    <>
      {scheduledReportFlyoutOpen && (
        <ScheduledReportFlyout
          availableFormats={formats}
          onClose={() => setScheduledReportFlyoutOpen(false)}
          scheduledReport={{ jobParams: '' }}
        />
      )}
      <EuiPageHeader
        data-test-subj="reportingPageHeader"
        bottomBorder
        pageTitle={
          <FormattedMessage
            id="xpack.reporting.listing.reports.titleStateful"
            defaultMessage="Reports"
          />
        }
        description={
          <FormattedMessage
            id="xpack.reporting.listing.reports.subtitleStateful"
            defaultMessage="Get reports generated in Kibana applications."
          />
        }
        rightSideItems={[
          <EuiButton fill onClick={() => setScheduledReportFlyoutOpen(true)}>
            Schedule export
          </EuiButton>,
        ]}
      />

      <MigrateIlmPolicyCallOut toasts={toasts} />

      <EuiSpacer size={'l'} />

      <ReportListingTable
        {...listingProps}
        apiClient={apiClient}
        capabilities={capabilities}
        config={config}
        toasts={toasts}
        navigateToUrl={navigateToUrl}
        urlService={urlService}
      />

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
  );
};
