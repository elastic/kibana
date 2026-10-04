/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { dynamic } from '@kbn/shared-ux-utility';
import { ML_PAGES } from '@kbn/ml-common-types/locator_ml_pages';
import { basicResolvers } from '../../resolvers';
import type { MlRoute } from '../../router';
import { createPath, PageLoader } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import {
  type NavigateToApp,
  getMlManagementBreadcrumb,
  getStackManagementBreadcrumb,
} from '../../breadcrumbs';

const Page = dynamic(async () => ({
  default: (await import('../../../jobs/new_job/pages/components/esql_job')).Page,
}));

export const esqlRouteFactory = (navigateToApp: NavigateToApp): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_ESQL),
  render: () => <PageWrapper />,
  breadcrumbs: [
    getStackManagementBreadcrumb(navigateToApp),
    getMlManagementBreadcrumb('ANOMALY_DETECTION_MANAGEMENT_BREADCRUMB', navigateToApp),
    getMlManagementBreadcrumb('CREATE_JOB_MANAGEMENT_BREADCRUMB', navigateToApp),
    {
      text: i18n.translate('xpack.ml.jobsBreadcrumbs.esqlLabel', {
        defaultMessage: 'ES|QL',
      }),
      href: '',
    },
  ],
});

const PageWrapper: FC = () => {
  const { context } = useRouteResolver('full', ['canCreateJob'], basicResolvers());

  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};
