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
import { i18n } from '@kbn/i18n';

import { timefilter } from 'ui/timefilter';

import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';

import { checkFullLicense } from '../../../license/check_license';
import { checkGetJobsPrivilege, checkPermission } from '../../../privilege/check_privilege';
import { getMlNodeCount } from '../../../ml_nodes_check/check_ml_nodes';
import { FilterLists } from '../../../settings/filter_lists';

import { SETTINGS, ML_BREADCRUMB } from '../../breadcrumbs';

const breadcrumbs = [
  ML_BREADCRUMB,
  SETTINGS,
  {
    text: i18n.translate('xpack.ml.settings.breadcrumbs.filterListsLabel', {
      defaultMessage: 'Filter lists',
    }),
    href: '#/settings/filter_lists',
  },
];

export const filterListRoute: MlRoute = {
  path: '/settings/filter_lists',
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

  const canCreateFilter = checkPermission('canCreateFilter');
  const canDeleteFilter = checkPermission('canDeleteFilter');

  return (
    <PageLoader context={context}>
      <FilterLists {...{ canCreateFilter, canDeleteFilter }} />
    </PageLoader>
  );
};
