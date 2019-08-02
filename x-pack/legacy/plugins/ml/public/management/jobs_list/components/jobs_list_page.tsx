/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { I18nContext } from 'ui/i18n';
import {
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiSpacer,
  EuiTabbedContent,
  EuiTitle,
} from '@elastic/eui';

// @ts-ignore undeclared module
import { JobsListView } from '../../../jobs/jobs_list/components/jobs_list_view';

export const JobsListPage = () => {
  const tabs = [
    {
      id: 'anomaly_detection_jobs',
      name: i18n.translate('xpack.ml.management.jobsList.anomalyDetectionTab', {
        defaultMessage: 'Anomaly detection',
      }),
      content: (
        <Fragment>
          <EuiSpacer size="m" />
          <JobsListView isManagementTable={true} />
        </Fragment>
      ),
    },
    {
      id: 'analytics_jobs',
      name: i18n.translate('xpack.ml.management.jobsList.analyticsTab', {
        defaultMessage: 'Analytics',
      }),
      content: renderAnalyticsJobs(),
    },
  ];

  function renderAnalyticsJobs() {
    return <div>Analytics job placeholder</div>;
  }

  function renderTabs() {
    return <EuiTabbedContent size="s" tabs={tabs} initialSelectedTab={tabs[0]} />;
  }

  return (
    <I18nContext>
      <EuiPageContent>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle>
              <h2>
                {i18n.translate('xpack.ml.management.jobsList.jobsListTitle', {
                  defaultMessage: 'Jobs',
                })}
              </h2>
            </EuiTitle>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
        <EuiPageContentBody>{renderTabs()}</EuiPageContentBody>
      </EuiPageContent>
    </I18nContext>
  );
};
