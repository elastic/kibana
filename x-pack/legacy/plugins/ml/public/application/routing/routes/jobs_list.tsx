/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, FC } from 'react';
import { useObservable } from 'react-use';
import { i18n } from '@kbn/i18n';
import { timefilter } from 'ui/timefilter';
import { DEFAULT_REFRESH_INTERVAL_MS } from '../../../../common/constants/jobs_list';
import { mlTimefilterRefresh$ } from '../../services/timefilter_refresh_service';
import { useUrlState } from '../../util/url_state';
import { MlRoute, PageLoader, PageProps } from '../router';
import { useResolver } from '../use_resolver';
import { basicResolvers } from '../resolvers';
import { JobsPage } from '../../jobs/jobs_list';
import { ANOMALY_DETECTION_BREADCRUMB, ML_BREADCRUMB } from '../breadcrumbs';

const breadcrumbs = [
  ML_BREADCRUMB,
  ANOMALY_DETECTION_BREADCRUMB,
  {
    text: i18n.translate('xpack.ml.anomalyDetection.jobManagementLabel', {
      defaultMessage: 'Job Management',
    }),
    href: '',
  },
];

export const jobListRoute: MlRoute = {
  path: '/jobs',
  render: (props, config, deps) => <PageWrapper config={config} {...props} deps={deps} />,
  breadcrumbs,
};

const PageWrapper: FC<PageProps> = ({ config, deps }) => {
  const { context } = useResolver(undefined, undefined, config, basicResolvers(deps));

  const [globalState, setGlobalState] = useUrlState('_g');

  const mlTimefilterRefresh = useObservable(mlTimefilterRefresh$);
  const lastRefresh = mlTimefilterRefresh?.lastRefresh ?? 0;
  const refreshValue = globalState?.refreshInterval?.value ?? 0;
  const refreshPause = globalState?.refreshInterval?.pause ?? true;
  const blockRefresh = refreshValue === 0 || refreshPause === true;

  useEffect(() => {
    timefilter.disableTimeRangeSelector();
    timefilter.enableAutoRefreshSelector();

    // If the refreshInterval defaults to 0s/pause=true, set it to 30s/pause=false,
    // otherwise pass on the globalState's settings to the date picker.
    const refreshInterval =
      refreshValue === 0 && refreshPause === true
        ? { pause: false, value: DEFAULT_REFRESH_INTERVAL_MS }
        : { pause: refreshPause, value: refreshValue };
    setGlobalState({ refreshInterval });
    timefilter.setRefreshInterval(refreshInterval);
  }, []);

  return (
    <PageLoader context={context}>
      <JobsPage blockRefresh={blockRefresh} lastRefresh={lastRefresh} />
    </PageLoader>
  );
};
