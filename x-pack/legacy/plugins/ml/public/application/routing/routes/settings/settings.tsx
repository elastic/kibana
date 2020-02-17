/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, FC } from 'react';

import { timefilter } from 'ui/timefilter';

import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';

import { checkFullLicense } from '../../../license/check_license';
import { checkGetJobsPrivilege, checkPermission } from '../../../privilege/check_privilege';
import { getMlNodeCount } from '../../../ml_nodes_check/check_ml_nodes';
import { Settings } from '../../../settings';
import { ML_BREADCRUMB, SETTINGS } from '../../breadcrumbs';

const breadcrumbs = [ML_BREADCRUMB, SETTINGS];

export const settingsRoute: MlRoute = {
  path: '/settings',
  render: (props, config, deps) => <PageWrapper config={config} {...props} deps={deps} />,
  breadcrumbs,
};

const PageWrapper: FC<PageProps> = ({ config }) => {
  const { context } = useResolver(undefined, undefined, config, {
    checkFullLicense,
    checkGetJobsPrivilege,
    getMlNodeCount,
  });

  useEffect(() => {
    timefilter.disableTimeRangeSelector();
    timefilter.disableAutoRefreshSelector();
  }, []);

  const canGetFilters = checkPermission('canGetFilters');
  const canGetCalendars = checkPermission('canGetCalendars');

  return (
    <PageLoader context={context}>
      <Settings canGetCalendars={canGetCalendars} canGetFilters={canGetFilters} />
    </PageLoader>
  );
};
