/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { decode } from 'rison-node';

// @ts-ignore
import queryString from 'query-string';
import { MlRoute, PageLoader } from '../../router';
import { useResolver } from '../../router';
import { basicResolvers } from '../../resolvers';
import { Page } from '../../../data_frame_analytics/pages/analytics_exploration';
import { ANALYSIS_CONFIG_TYPE } from '../../../data_frame_analytics/common/analytics';
import { DATA_FRAME_TASK_STATE } from '../../../data_frame_analytics/pages/analytics_management/components/analytics_list/common';

export const analyticsJobExplorationRoute: MlRoute = {
  path: '/data_frame_analytics/exploration',
  render: (props: any, config: any) => <PageWrapper config={config} {...props} />,
};

const PageWrapper: FC<{ location: any; config: any }> = ({ location, config }) => {
  const { context } = useResolver('', config, basicResolvers);
  const { _g } = queryString.parse(location.search);
  let globalState: any = null;
  try {
    globalState = decode(_g);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Could not parse global state');
    window.location.href = '#data_frame_analytics';
  }
  const jobId: string = globalState.ml.jobId;
  const analysisType: ANALYSIS_CONFIG_TYPE = globalState.ml.analysisType;
  const jobStatus: DATA_FRAME_TASK_STATE = globalState.ml.jobStatus;

  return (
    <PageLoader context={context}>
      <Page jobId={jobId} analysisType={analysisType} jobStatus={jobStatus} />
    </PageLoader>
  );
};
