/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';
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
import { JobsListView } from '../../../../jobs/jobs_list/components/jobs_list_view';
import { DataFrameAnalyticsList } from '../../../../data_frame_analytics/pages/analytics_management/components/analytics_list';

interface Props {
  isMlEnabledInSpace: boolean;
}

export const JobsListPage: FC<Props> = ({ isMlEnabledInSpace }) => {
  const tabs = [
    {
      id: 'anomaly_detection_jobs',
      name: i18n.translate('xpack.ml.management.jobsList.anomalyDetectionTab', {
        defaultMessage: 'Anomaly detection',
      }),
      content: (
        <Fragment>
          <EuiSpacer size="m" />
          <JobsListView isManagementTable={true} isMlEnabledInSpace={isMlEnabledInSpace} />
        </Fragment>
      ),
    },
    {
      id: 'analytics_jobs',
      name: i18n.translate('xpack.ml.management.jobsList.analyticsTab', {
        defaultMessage: 'Analytics',
      }),
      content: (
        <Fragment>
          <EuiSpacer size="m" />
          <DataFrameAnalyticsList isManagementTable={true} />
        </Fragment>
      ),
    },
  ];

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
