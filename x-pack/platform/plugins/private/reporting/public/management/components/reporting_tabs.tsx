/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useMemo } from 'react';
import { EuiLoadingSpinner, EuiPageTemplate } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Route, Routes } from '@kbn/shared-ux-router';
import { useHistory, useParams } from 'react-router-dom';
import type { ILicense } from '@kbn/licensing-types';
import type { ClientConfigType } from '@kbn/reporting-public';
import { useInternalApiClient, useKibana } from '@kbn/reporting-public';
import { FormattedMessage } from '@kbn/i18n-react';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';
import { SCHEDULED_REPORT_VALID_LICENSES } from '@kbn/reporting-common';
import type { Section } from '../../constants';
import { REPORTING_EXPORTS_PATH, REPORTING_SCHEDULES_PATH } from '../../constants';
import ReportExportsTable from './report_exports_table';
import ReportSchedulesTable from './report_schedules_table';
import { LicensePrompt } from './license_prompt';
import IlmPolicyWrapper from './ilm_policy_wrapper';

export interface MatchParams {
  section: Section;
}

export interface ReportingTabsProps {
  config: ClientConfigType;
}

export const ReportingTabs: React.FunctionComponent<{ config: ClientConfigType }> = ({
  config,
}) => {
  const { section } = useParams<MatchParams>();
  const history = useHistory();

  const { apiClient } = useInternalApiClient();
  const {
    services: {
      application: { capabilities, navigateToApp, navigateToUrl },
      http,
      notifications,
      share: { url: urlService },
      license$,
    },
  } = useKibana();
  const license = useObservable<ILicense | null>(license$ ?? new Observable(), null);

  const licensingInfo = useMemo(() => {
    if (!license) {
      return { enableLinks: false, showLinks: false };
    }
    if (!license || !license.type) {
      return {
        showLinks: true,
        enableLinks: false,
        message:
          'You cannot use Reporting because license information is not available at this time.',
      };
    }

    if (!license.isActive) {
      return {
        showLinks: true,
        enableLinks: false,
        message: 'You cannot use Reporting because your ${license.type} license has expired.',
      };
    }

    if (!SCHEDULED_REPORT_VALID_LICENSES.includes(license.type)) {
      return {
        showLinks: false,
        enableLinks: false,
        message:
          'Your {licenseType} license does not support Scheduled reports. Please upgrade your license.',
      };
    }

    return {
      showLinks: true,
      enableLinks: true,
    };
  }, [license]);

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
      isBeta: true,
    },
  ];

  const { enableLinks, showLinks } = licensingInfo;

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
            ? [<IlmPolicyWrapper config={config} apiClient={apiClient} />]
            : []
        }
        data-test-subj="reportingPageHeader"
        pageTitle={
          <FormattedMessage id="xpack.reporting.reports.titleStateful" defaultMessage="Reporting" />
        }
        description={
          <FormattedMessage
            id="xpack.reporting.reports.subtitleStateful"
            defaultMessage="Get reports generated in Kibana applications."
          />
        }
        tabs={tabs.map(({ id, name, isBeta = false }) => ({
          label: !isBeta ? name : <>{name}</>,
          onClick: () => onSectionChange(id as Section),
          isSelected: id === section,
          key: id,
          'data-test-subj': `reportingTabs-${id}`,
        }))}
      />

      <Routes>
        <Route
          exact
          path={REPORTING_EXPORTS_PATH}
          render={() => (
            <Suspense fallback={<EuiLoadingSpinner size={'xl'} />}>
              <ReportExportsTable
                apiClient={apiClient}
                toasts={notifications.toasts}
                license$={license$}
                config={config}
                capabilities={capabilities}
                redirect={navigateToApp}
                navigateToUrl={navigateToUrl}
                urlService={urlService}
                http={http}
              />
            </Suspense>
          )}
        />
        <Route
          exact
          path={REPORTING_SCHEDULES_PATH}
          render={() => (
            <Suspense fallback={<EuiLoadingSpinner size={'xl'} />}>
              {enableLinks && showLinks ? <ReportSchedulesTable /> : <LicensePrompt />}
            </Suspense>
          )}
        />
      </Routes>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ReportingTabs as default };
