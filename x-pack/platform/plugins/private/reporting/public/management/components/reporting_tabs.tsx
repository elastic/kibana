/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useMemo, useRef, type RefObject } from 'react';
import { EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu, AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { Route, Routes } from '@kbn/shared-ux-router';
import { useHistory, useParams } from 'react-router-dom';
import type { ILicense } from '@kbn/licensing-types';
import type { ClientConfigType } from '@kbn/reporting-public';
import { useInternalApiClient, useKibana } from '@kbn/reporting-public';
import { ILM_POLICY_NAME, SCHEDULED_REPORT_VALID_LICENSES } from '@kbn/reporting-common';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';
import type { Section } from '../../constants';
import { REPORTING_EXPORTS_PATH, REPORTING_SCHEDULES_PATH } from '../../constants';
import { useIlmPolicyStatus } from '../../lib/ilm_policy_status_context';
import ReportExportsTable from './report_exports_table';
import ReportSchedulesTable from './report_schedules_table';
import { LicensePrompt } from './license_prompt';
import IlmPolicyWrapper from './ilm_policy_wrapper';
import type { ReportDiagnosticHandle } from './report_diagnostic';

export interface MatchParams {
  section: Section;
}

export interface ReportingTabsProps {
  config: ClientConfigType;
}

const reportingTitle = i18n.translate('xpack.reporting.reports.titleStateful', {
  defaultMessage: 'Reporting',
});

const reportingDescription = i18n.translate('xpack.reporting.reports.subtitleStateful', {
  defaultMessage: 'Get reports generated in Kibana applications.',
});

const exportsTabLabel = i18n.translate('xpack.reporting.tabs.exports', {
  defaultMessage: 'Exports',
});

const schedulesTabLabel = i18n.translate('xpack.reporting.tabs.schedules', {
  defaultMessage: 'Schedules',
});

const ilmPolicyLinkLabel = i18n.translate('xpack.reporting.listing.reports.ilmPolicyLinkText', {
  defaultMessage: 'Edit ILM policy',
});

const runDiagnosisLabel = i18n.translate('xpack.reporting.listing.diagnosticButton', {
  defaultMessage: 'Run diagnosis',
});

const ReportingPageHeader = ({
  config,
  tabs,
  diagnosticRef,
}: {
  config: ClientConfigType;
  tabs: AppHeaderTab[];
  diagnosticRef: RefObject<ReportDiagnosticHandle | null>;
}) => {
  if (!config.statefulSettings.enabled) {
    return (
      <AppHeader
        title={reportingTitle}
        description={reportingDescription}
        tabs={tabs}
        spacing="bleed"
      />
    );
  }

  return <StatefulReportingPageHeader config={config} tabs={tabs} diagnosticRef={diagnosticRef} />;
};

const StatefulReportingPageHeader = ({
  config,
  tabs,
  diagnosticRef,
}: {
  config: ClientConfigType;
  tabs: AppHeaderTab[];
  diagnosticRef: RefObject<ReportDiagnosticHandle | null>;
}) => {
  const {
    services: {
      application: { capabilities },
      share: { url: urlService },
    },
  } = useKibana();
  const ilmPolicyContextValue = useIlmPolicyStatus();
  const ilmLocator = urlService.locators.get('ILM_LOCATOR_ID');
  const hasIlmPolicy = ilmPolicyContextValue?.status !== 'policy-not-found';
  const showIlmPolicyLink = Boolean(
    capabilities?.management?.data?.index_lifecycle_management && ilmLocator && hasIlmPolicy
  );
  const configAllowsImageReports =
    config.export_types.pdf.enabled || config.export_types.png.enabled;

  const menu = useMemo<AppHeaderMenu | undefined>(() => {
    const items: NonNullable<AppHeaderMenu['items']> = [];

    if (showIlmPolicyLink && ilmLocator) {
      items.push({
        id: 'editIlmPolicy',
        label: ilmPolicyLinkLabel,
        iconType: 'external',
        testId: 'ilmPolicyLink',
        isLoading: ilmPolicyContextValue?.isLoading,
        disableButton: ilmPolicyContextValue?.isLoading,
        run: () => {
          const url = ilmLocator.getRedirectUrl({
            page: 'policy_edit',
            policyName: ILM_POLICY_NAME,
          });
          window.open(url, '_blank');
          window.focus();
        },
      });
    }

    const primaryActionItem = configAllowsImageReports
      ? {
          id: 'runDiagnosis',
          label: runDiagnosisLabel,
          iconType: 'inspect',
          testId: 'screenshotDiagnosticLink',
          run: () => {
            diagnosticRef.current?.open();
          },
        }
      : undefined;

    if (!items.length && !primaryActionItem) {
      return undefined;
    }

    return {
      ...(items.length ? { items } : {}),
      ...(primaryActionItem ? { primaryActionItem } : {}),
    };
  }, [
    configAllowsImageReports,
    diagnosticRef,
    ilmLocator,
    ilmPolicyContextValue?.isLoading,
    showIlmPolicyLink,
  ]);

  return (
    <AppHeader
      title={reportingTitle}
      description={reportingDescription}
      tabs={tabs}
      menu={menu}
      spacing="bleed"
    />
  );
};

export const ReportingTabs: React.FunctionComponent<{ config: ClientConfigType }> = ({
  config,
}) => {
  const { section } = useParams<MatchParams>();
  const history = useHistory();
  const diagnosticRef = useRef<ReportDiagnosticHandle>(null);

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

  const { enableLinks, showLinks } = licensingInfo;

  const tabs: AppHeaderTab[] = [
    {
      id: 'exports',
      label: exportsTabLabel,
      href: history.createHref({ pathname: '/exports' }),
      onClick: () => history.push('/exports'),
      isSelected: section === 'exports',
      'data-test-subj': 'reportingTabs-exports',
    },
    {
      id: 'schedules',
      label: schedulesTabLabel,
      href: history.createHref({ pathname: '/schedules' }),
      onClick: () => history.push('/schedules'),
      isSelected: section === 'schedules',
      'data-test-subj': 'reportingTabs-schedules',
    },
  ];

  return (
    <>
      <ReportingPageHeader config={config} tabs={tabs} diagnosticRef={diagnosticRef} />
      <EuiSpacer size="l" />
      {config.statefulSettings.enabled ? (
        <IlmPolicyWrapper ref={diagnosticRef} config={config} apiClient={apiClient} />
      ) : null}

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
