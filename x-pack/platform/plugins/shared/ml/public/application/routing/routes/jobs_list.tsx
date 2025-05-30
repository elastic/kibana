/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import {
  mlTimefilterRefresh$,
  useRefreshIntervalUpdates,
  useTimefilter,
} from '@kbn/ml-date-picker';
import { dynamic } from '@kbn/shared-ux-utility';
import { DEFAULT_REFRESH_INTERVAL_MS } from '../../../../common/constants/jobs_list';
import type { MlRoute } from '../router';
import { PageLoader } from '../router';
import { useRouteResolver } from '../use_resolver';
import { type NavigateToApp, getStackManagementBreadcrumb } from '../breadcrumbs';
import { AnnotationUpdatesService } from '../../services/annotations_service';
import { MlAnnotationUpdatesContext } from '../../contexts/ml/ml_annotation_updates_context';
import { basicResolvers, initSavedObjects } from '../resolvers';

const JobsPage = dynamic(async () => ({
  default: (await import('../../jobs/jobs_list')).JobsPage,
}));

export const jobListRouteFactory = (navigateToApp: NavigateToApp): MlRoute => ({
  id: 'anomaly_detection',
  title: i18n.translate('xpack.ml.anomalyDetection.jobs.docTitle', {
    defaultMessage: 'Anomaly Detection Jobs',
  }),
  path: '/',
  render: () => <PageWrapper />,
  breadcrumbs: [
    getStackManagementBreadcrumb(navigateToApp),
    {
      text: i18n.translate('xpack.ml.anomalyDetection.jobsManagementLabel', {
        defaultMessage: 'Anomaly Detection Jobs',
      }),
    },
  ],
  'data-test-subj': 'mlPageJobManagement',
  enableDatePicker: false,
});

const PageWrapper: FC = () => {
  const { context } = useRouteResolver('full', ['canGetJobs'], {
    ...basicResolvers(),
    initSavedObjects,
  });

  const timefilter = useTimefilter({ timeRangeSelector: false, autoRefreshSelector: true });

  const refresh = useRefreshIntervalUpdates();

  const mlTimefilterRefresh = useObservable(mlTimefilterRefresh$);
  const lastRefresh = mlTimefilterRefresh?.lastRefresh ?? 0;

  const refreshValue = refresh.value ?? 0;
  const refreshPause = refresh.pause ?? true;

  const refreshList = useCallback(() => {
    mlTimefilterRefresh$.next({
      lastRefresh: Date.now(),
    });
  }, []);

  useEffect(() => {
    const refreshInterval =
      refreshValue === 0 || refreshPause === true
        ? { pause: false, value: DEFAULT_REFRESH_INTERVAL_MS }
        : { pause: refreshPause, value: refreshValue };
    timefilter.setRefreshInterval(refreshInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const annotationUpdatesService = useMemo(() => new AnnotationUpdatesService(), []);

  return (
    <PageLoader context={context}>
      <MlAnnotationUpdatesContext.Provider value={annotationUpdatesService}>
        <JobsPage lastRefresh={lastRefresh} refreshList={refreshList} />
      </MlAnnotationUpdatesContext.Provider>
    </PageLoader>
  );
};
