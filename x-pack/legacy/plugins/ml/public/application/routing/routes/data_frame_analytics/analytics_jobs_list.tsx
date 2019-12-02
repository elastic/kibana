/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';

import { MlRoute, PageLoader } from '../../router';
import { useResolver } from '../../router';
import { basicResolvers } from '../../resolvers';
import { Page } from '../../../data_frame_analytics/pages/analytics_management';
import { ML_BREADCRUMB } from '../../breadcrumbs';

const breadcrumbs = [
  ML_BREADCRUMB,
  {
    text: i18n.translate('xpack.ml.dataFrameAnalyticsBreadcrumbs.dataFrameListLabel', {
      defaultMessage: 'Data Frame Analytics',
    }),
    href: '',
  },
];

export const analyticsJobsListRoute: MlRoute = {
  path: '/data_frame_analytics',
  render: (props: any, config: any) => <PageWrapper config={config} {...props} />,
  breadcrumbs,
};

const PageWrapper: FC<{ location: any; config: any }> = ({ location, config }) => {
  const { context } = useResolver('', config, basicResolvers);
  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};
