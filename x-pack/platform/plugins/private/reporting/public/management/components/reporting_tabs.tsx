/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiPageTemplate } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Route, Routes } from '@kbn/shared-ux-router';
import { RouteComponentProps } from 'react-router-dom';
import { CoreStart, ScopedHistory } from '@kbn/core/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  ClientConfigType,
  ReportingAPIClient,
  useInternalApiClient,
  useKibana,
} from '@kbn/reporting-public';
import { SharePluginStart } from '@kbn/share-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { suspendedComponentWithProps } from './suspended_component_with_props';
import { REPORTING_EXPORTS_PATH, REPORTING_SCHEDULES_PATH, Section } from '../../constants';
import ReportExportsTable from './report_exports_table';
import { IlmPolicyLink } from './ilm_policy_link';
import { ReportDiagnostic } from './report_diagnostic';
import { useIlmPolicyStatus } from '../../lib/ilm_policy_status_context';
import { MigrateIlmPolicyCallOut } from './migrate_ilm_policy_callout';
import ReportSchedulesTable from './report_schedules_table';

export interface MatchParams {
  section: Section;
}

export interface ReportingTabsProps {
  coreStart: CoreStart;
  license$: LicensingPluginStart['license$'];
  dataService: DataPublicPluginStart;
  shareService: SharePluginStart;
  config: ClientConfigType;
  apiClient: ReportingAPIClient;
}

export const ReportingTabs: React.FunctionComponent<
  Partial<RouteComponentProps> & ReportingTabsProps
> = (props) => {
  const { coreStart, license$, shareService, config, ...rest } = props;
  const { notifications } = coreStart;
  const { section } = rest.match?.params as MatchParams;
  const history = rest.history as ScopedHistory;
  const { apiClient } = useInternalApiClient();
  const {
    services: {
      application: { capabilities, navigateToApp, navigateToUrl },
      http,
    },
  } = useKibana();

  const ilmLocator = shareService.url.locators.get('ILM_LOCATOR_ID');
  const ilmPolicyContextValue = useIlmPolicyStatus();
  const hasIlmPolicy = ilmPolicyContextValue?.status !== 'policy-not-found';
  const showIlmPolicyLink = Boolean(ilmLocator && hasIlmPolicy);

  const tabs = [
    {
      id: 'exports',
      name: i18n.translate('xpack.reporting.tabs.exports', {
        defaultMessage: 'Exports',
      }),
    },
    {
      id: 'schedules',
      name: i18n.translate('xpack.reporting.tabs.schedules', {
        defaultMessage: 'Schedules',
      }),
    },
  ];

  const renderExportsList = useCallback(() => {
    return suspendedComponentWithProps(
      ReportExportsTable,
      'xl'
    )({
      apiClient,
      toasts: notifications.toasts,
      license$,
      config,
      capabilities,
      redirect: navigateToApp,
      navigateToUrl,
      urlService: shareService.url,
      http,
    });
  }, [
    apiClient,
    notifications.toasts,
    license$,
    config,
    capabilities,
    navigateToApp,
    navigateToUrl,
    shareService.url,
    http,
  ]);

  const renderSchedulesList = useCallback(() => {
    return (
      <EuiPageTemplate.Section grow={false} paddingSize="none">
        {suspendedComponentWithProps(
          ReportSchedulesTable,
          'xl'
        )({
          apiClient,
          toasts: notifications.toasts,
          license$,
          config,
          capabilities,
          redirect: navigateToApp,
          navigateToUrl,
          urlService: shareService.url,
          http,
        })}
      </EuiPageTemplate.Section>
    );
  }, [
    apiClient,
    notifications.toasts,
    license$,
    config,
    capabilities,
    navigateToApp,
    navigateToUrl,
    shareService.url,
    http,
  ]);

  const onSectionChange = (newSection: Section) => {
    history.push(`/${newSection}`);
  };

  return (
    <>
      <EuiPageTemplate.Header
        paddingSize="none"
        bottomBorder
        rightSideItems={
          config.statefulSettings.enabled
            ? [
                <MigrateIlmPolicyCallOut toasts={notifications.toasts} />,
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
                  )}{' '}
                </EuiFlexGroup>,
                <EuiFlexItem grow={false}>
                  <ReportDiagnostic clientConfig={config} apiClient={apiClient} />
                </EuiFlexItem>,
              ]
            : []
        }
        data-test-subj="reportingPageHeader"
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
        tabs={tabs.map(({ id, name }) => ({
          label: name,
          onClick: () => onSectionChange(id as Section),
          isSelected: id === section,
          key: id,
          'data-test-subj': `reportingTabs-${id}`,
        }))}
      />

      <Routes>
        <Route exact path={REPORTING_EXPORTS_PATH} component={renderExportsList} />
        <Route exact path={REPORTING_SCHEDULES_PATH} component={renderSchedulesList} />
      </Routes>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ReportingTabs as default };
