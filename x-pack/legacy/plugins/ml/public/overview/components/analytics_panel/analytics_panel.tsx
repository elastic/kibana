/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useState, useEffect } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AnalyticsTable } from './table';
import { getAnalyticsFactory } from '../../../data_frame_analytics/pages/analytics_management/services/analytics_service';
import { DataFrameAnalyticsListRow } from '../../../data_frame_analytics/pages/analytics_management/components/analytics_list/common';

export const AnalyticsPanel: FC = () => {
  const [analytics, setAnalytics] = useState<DataFrameAnalyticsListRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<any>(undefined);
  const [isInitialized, setIsInitialized] = useState(false);

  const getAnalytics = getAnalyticsFactory(setAnalytics, setErrorMessage, setIsInitialized, false);

  useEffect(() => {
    getAnalytics(true);
  }, []);

  const onRefresh = () => {
    getAnalytics(true);
  };

  const errorDisplay = (
    <Fragment>
      <EuiCallOut
        title={i18n.translate('xpack.ml.overview.analyticsList.errorPromptTitle', {
          defaultMessage: 'An error occurred getting the data frame analytics list.',
        })}
        color="danger"
        iconType="alert"
      >
        <pre>
          {errorMessage && errorMessage.message !== undefined
            ? errorMessage.message
            : JSON.stringify(errorMessage)}
        </pre>
      </EuiCallOut>
    </Fragment>
  );

  return (
    <EuiPanel className="mlOverviewPanel">
      {typeof errorMessage !== 'undefined' && errorDisplay}
      {isInitialized === false && <EuiLoadingSpinner />}     
      {isInitialized === true && analytics.length === 0 && (
        <EuiEmptyPrompt
          iconType="createAdvancedJob"
          title={
            <h2>
              {i18n.translate('xpack.ml.overview.analyticsList.createFirstJobMessage', {
                defaultMessage: 'Create your first analytics job.',
              })}
            </h2>
          }
          body={
            <Fragment>
              <p>
                {i18n.translate('xpack.ml.overview.analyticsList.emptyPromptText', {
                  defaultMessage: `Data frame analytics enable you to perform different analyses of your data and annotate it with the results. The analytics job stores the annotated data, as well as a copy of the source data, in a new index.`,
                })}
              </p>
            </Fragment>
          }
          actions={
            <EuiButton href="#/data_frame_analytics?" color="primary" fill>
              {i18n.translate('xpack.ml.overview.analyticsList.createJobButtonText', {
                defaultMessage: 'Create job.',
              })}
            </EuiButton>
          }
        />
      )}
      {isInitialized === true && analytics.length > 0 && (
        <Fragment>
          <AnalyticsTable items={analytics} />
          <EuiSpacer size="m" />
          <div className="mlOverviewPanel__buttons">
            <EuiButtonEmpty size="s" onClick={onRefresh}>
              {i18n.translate('xpack.ml.overview.analyticsList.refreshJobsButtonText', {
                defaultMessage: 'Refresh',
              })}
            </EuiButtonEmpty>
            <EuiButton size="s" fill href="#/data_frame_analytics?">
              {i18n.translate('xpack.ml.overview.analyticsList.manageJobsButtonText', {
                defaultMessage: 'Manage jobs',
              })}
            </EuiButton>
          </div>
        </Fragment>
      )}
    </EuiPanel>
  );
};
