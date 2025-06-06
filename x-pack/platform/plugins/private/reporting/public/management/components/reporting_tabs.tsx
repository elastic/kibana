/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useCallback, useEffect } from 'react';
import { EuiPageHeader, EuiPageTemplate, EuiTab, EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { REPORTING_EXPORTS_PATH, REPORTING_SCHEDULES_PATH, Section } from '../../constants';
import { Route, Routes } from '@kbn/shared-ux-router';
import { suspendedComponentWithProps } from '../../suspended_component_with_props';
import { RouteComponentProps } from 'react-router';
import { CoreStart, ScopedHistory } from '@kbn/core/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { ClientConfigType, ReportingAPIClient, useKibana } from '@kbn/reporting-public';
import { SharePluginStart } from '@kbn/share-plugin/public';
import { getReportingSectionBreadcrumb } from './get_reporting_sections_breadcrumb';
import { FormattedMessage } from '@kbn/i18n-react';

const ReportListing = lazy(() => import('../report_listing'));

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
  const { coreStart, license$, shareService, config, apiClient, ...rest } = props;
  const { application, notifications } = coreStart;
  const { section } = rest.match?.params as MatchParams;
  const history = rest.history as ScopedHistory;
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
      ReportListing,

      'xl'
    )({
      apiClient,
      toasts: notifications.toasts,
      license$,
      config,
      redirect: application.navigateToApp,
      navigateToUrl: application.navigateToUrl,
      urlService: shareService.url,
    });
  }, []);

  const renderSchedulesList = useCallback(() => {
    return (
      <EuiPageTemplate.Section grow={false} paddingSize="none">
        {suspendedComponentWithProps(
          ReportListing,
          'xl'
        )({
          apiClient,
          toasts: notifications.toasts,
          license$,
          config,
          redirect: application.navigateToApp,
          navigateToUrl: application.navigateToUrl,
          urlService: shareService.url,
        })}
      </EuiPageTemplate.Section>
    );
  }, []);

  const onSectionChange = (newSection: Section) => {
    history.push(`/${newSection}`);
  };

  return (
    <>
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
      />

      <EuiTabs>
        {tabs.map(({ id, name }) => (
          <EuiTab
            key={id}
            onClick={() => onSectionChange(id as Section)}
            isSelected={section === id}
            data-test-subj={`connectionDetailsTabBtn-${id}`}
          >
            {name}
          </EuiTab>
        ))}
      </EuiTabs>
      <Routes>
        <Route exact path={REPORTING_EXPORTS_PATH} component={renderExportsList} />

        <Route exact path={REPORTING_SCHEDULES_PATH} component={renderSchedulesList} />
      </Routes>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ReportingTabs as default };
