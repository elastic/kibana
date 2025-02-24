/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';

import { i18n } from '@kbn/i18n';

import { dynamic } from '@kbn/shared-ux-utility';
import { basicResolvers } from '../../resolvers';
import { ML_PAGES } from '../../../../locator';
import type { NavigateToPath } from '../../../contexts/kibana';
import { useMlKibana } from '../../../contexts/kibana';

import type { MlRoute, PageProps } from '../../router';
import { createPath, PageLoader } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import { useMlJobService } from '../../../services/job_service';
import { getDateFormatTz } from '../../../explorer/explorer_utils';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { MlAnnotationUpdatesContext } from '../../../contexts/ml/ml_annotation_updates_context';
import { AnnotationUpdatesService } from '../../../services/annotations_service';
import { AnomalyExplorerContextProvider } from '../../../explorer/anomaly_explorer_context';

const ExplorerUrlStateManager = dynamic(async () => ({
  default: (await import('./state_manager')).ExplorerUrlStateManager,
}));

export const explorerRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'explorer',
  path: createPath(ML_PAGES.ANOMALY_EXPLORER),
  title: i18n.translate('xpack.ml.anomalyDetection.anomalyExplorer.docTitle', {
    defaultMessage: 'Anomaly Explorer',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('ANOMALY_DETECTION_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.anomalyDetection.anomalyExplorerLabel', {
        defaultMessage: 'Anomaly Explorer',
      }),
    },
  ],
  enableDatePicker: true,
  'data-test-subj': 'mlPageAnomalyExplorer',
});

const PageWrapper: FC<PageProps> = () => {
  const {
    services: {
      mlServices: { mlApi },
      uiSettings,
    },
  } = useMlKibana();
  const mlJobService = useMlJobService();

  const { context, results } = useRouteResolver('full', ['canGetJobs'], {
    ...basicResolvers(),
    jobs: mlJobService.loadJobsWrapper,
    jobsWithTimeRange: () => mlApi.jobs.jobsWithTimerange(getDateFormatTz(uiSettings)),
  });

  const annotationUpdatesService = useMemo(() => new AnnotationUpdatesService(), []);

  return (
    <PageLoader context={context}>
      <MlAnnotationUpdatesContext.Provider value={annotationUpdatesService}>
        <AnomalyExplorerContextProvider>
          {results ? (
            <ExplorerUrlStateManager jobsWithTimeRange={results.jobsWithTimeRange.jobs} />
          ) : null}
        </AnomalyExplorerContextProvider>
      </MlAnnotationUpdatesContext.Provider>
    </PageLoader>
  );
};
