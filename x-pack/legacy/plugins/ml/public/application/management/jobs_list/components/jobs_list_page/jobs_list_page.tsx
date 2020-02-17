/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { I18nContext } from 'ui/i18n';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageContent,
  EuiPageContentBody,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { getDocLinks } from '../../../../util/dependency_cache';

// @ts-ignore undeclared module
import { JobsListView } from '../../../../jobs/jobs_list/components/jobs_list_view/index';
import { DataFrameAnalyticsList } from '../../../../data_frame_analytics/pages/analytics_management/components/analytics_list';

interface Props {
  isMlEnabledInSpace: boolean;
}
interface Tab {
  id: string;
  name: string;
  content: any;
}

function getTabs(isMlEnabledInSpace: boolean): Tab[] {
  return [
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
          <DataFrameAnalyticsList
            isManagementTable={true}
            isMlEnabledInSpace={isMlEnabledInSpace}
          />
        </Fragment>
      ),
    },
  ];
}

export const JobsListPage: FC<Props> = ({ isMlEnabledInSpace }) => {
  const docLinks = getDocLinks();
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;
  const tabs = getTabs(isMlEnabledInSpace);
  const [currentTabId, setCurrentTabId] = useState(tabs[0].id);
  const anomalyDetectionJobsUrl = `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-jobs.html`;
  const anomalyJobsUrl = `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-dfanalytics.html`;

  const anomalyDetectionDocsLabel = i18n.translate(
    'xpack.ml.management.jobsList.anomalyDetectionDocsLabel',
    {
      defaultMessage: 'Anomaly detection jobs docs',
    }
  );
  const analyticsDocsLabel = i18n.translate('xpack.ml.management.jobsList.analyticsDocsLabel', {
    defaultMessage: 'Analytics jobs docs',
  });

  function renderTabs() {
    return (
      <EuiTabbedContent
        onTabClick={({ id }: { id: string }) => {
          setCurrentTabId(id);
        }}
        size="s"
        tabs={getTabs(isMlEnabledInSpace)}
        initialSelectedTab={tabs[0]}
      />
    );
  }

  return (
    <I18nContext>
      <EuiPageContent>
        <EuiTitle size="l">
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <h1>
                {i18n.translate('xpack.ml.management.jobsList.jobsListTitle', {
                  defaultMessage: 'Machine Learning Jobs',
                })}
              </h1>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                target="_blank"
                iconType="help"
                iconSide="left"
                color="primary"
                href={
                  currentTabId === 'anomaly_detection_jobs'
                    ? anomalyDetectionJobsUrl
                    : anomalyJobsUrl
                }
              >
                {currentTabId === 'anomaly_detection_jobs'
                  ? anomalyDetectionDocsLabel
                  : analyticsDocsLabel}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiTitle size="s">
          <EuiText color="subdued">
            {i18n.translate('xpack.ml.management.jobsList.jobsListTagline', {
              defaultMessage: 'View machine learning analytics and anomaly detection jobs.',
            })}
          </EuiText>
        </EuiTitle>
        <EuiSpacer size="l" />
        <EuiPageContentBody>{renderTabs()}</EuiPageContentBody>
      </EuiPageContent>
    </I18nContext>
  );
};
