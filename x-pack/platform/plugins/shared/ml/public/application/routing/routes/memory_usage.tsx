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
import { basicResolvers } from '../resolvers';
import { ML_PAGES } from '../../../locator';
import type { NavigateToPath } from '../../contexts/kibana';
import type { MlRoute } from '../router';
import { createPath, PageLoader } from '../router';
import { useRouteResolver } from '../use_resolver';
import { getBreadcrumbWithUrlForApp } from '../breadcrumbs';

const MemoryUsagePage = dynamic(async () => ({
  default: (await import('../../memory_usage')).MemoryUsagePage,
}));

export const nodesListRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: createPath(ML_PAGES.MEMORY_USAGE),
  render: () => <PageWrapper />,
  title: i18n.translate('xpack.ml.modelManagement.memoryUsage.docTitle', {
    defaultMessage: 'Memory Usage',
  }),
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.trainedModelsBreadcrumbs.nodeOverviewLabel', {
        defaultMessage: 'Memory Usage',
      }),
    },
  ],
  enableDatePicker: true,
  'data-test-subj': 'mlPageMemoryUsage',
});

const PageWrapper: FC = () => {
  const { context } = useRouteResolver('full', [], basicResolvers());

  return (
    <PageLoader context={context}>
      <MemoryUsagePage />
    </PageLoader>
  );
};
