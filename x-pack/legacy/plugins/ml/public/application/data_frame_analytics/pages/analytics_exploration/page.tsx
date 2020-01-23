/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiBetaBadge,
  EuiPage,
  EuiPageBody,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { NavigationMenu } from '../../../components/navigation_menu';

import { Exploration } from './components/exploration';
import { RegressionExploration } from './components/regression_exploration';
import { ClassificationExploration } from './components/classification_exploration';

import { ANALYSIS_CONFIG_TYPE } from '../../common/analytics';
import { DATA_FRAME_TASK_STATE } from '../analytics_management/components/analytics_list/common';

export const Page: FC<{
  jobId: string;
  analysisType: ANALYSIS_CONFIG_TYPE;
  jobStatus: DATA_FRAME_TASK_STATE;
}> = ({ jobId, analysisType, jobStatus }) => (
  <Fragment>
    <NavigationMenu tabId="data_frame_analytics" />
    <EuiPage data-test-subj="mlPageDataFrameAnalyticsExploration">
      <EuiPageBody>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle>
              <h1>
                <FormattedMessage
                  id="xpack.ml.dataframe.analytics.exploration.title"
                  defaultMessage="Analytics exploration"
                />
                <span>&nbsp;</span>
                <EuiBetaBadge
                  label={i18n.translate(
                    'xpack.ml.dataframe.analytics.exploration.experimentalBadgeLabel',
                    {
                      defaultMessage: 'Experimental',
                    }
                  )}
                  tooltipContent={i18n.translate(
                    'xpack.ml.dataframe.analytics.exploration.experimentalBadgeTooltipContent',
                    {
                      defaultMessage: `Data frame analytics are an experimental feature. We'd love to hear your feedback.`,
                    }
                  )}
                />
              </h1>
            </EuiTitle>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
        <EuiPageContentBody>
          <EuiSpacer size="l" />
          {analysisType === ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION && (
            <Exploration jobId={jobId} jobStatus={jobStatus} />
          )}
          {analysisType === ANALYSIS_CONFIG_TYPE.REGRESSION && (
            <RegressionExploration jobId={jobId} jobStatus={jobStatus} />
          )}
          {analysisType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION && (
            <ClassificationExploration jobId={jobId} jobStatus={jobStatus} />
          )}
        </EuiPageContentBody>
      </EuiPageBody>
    </EuiPage>
  </Fragment>
);
