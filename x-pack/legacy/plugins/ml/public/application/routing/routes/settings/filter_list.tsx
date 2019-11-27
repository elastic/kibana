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

import React, { FC } from 'react';

import { MlRoute, PageLoader } from '../../router';
import { useResolver } from '../../router';

import { checkFullLicense } from '../../../license/check_license';
import { checkGetJobsPrivilege, checkPermission } from '../../../privilege/check_privilege';
import { getMlNodeCount } from '../../../ml_nodes_check/check_ml_nodes';
import { FilterLists } from '../../../settings/filter_lists';

export const filterListRoute: MlRoute = {
  path: '/settings/filter_lists',
  render: (props: any, config: any) => <PageWrapper config={config} />,
};

const PageWrapper: FC<{ config: any }> = ({ config }) => {
  const { context } = useResolver(undefined, config, {
    checkFullLicense,
    checkGetJobsPrivilege,
    getMlNodeCount,
  });

  const canCreateFilter = checkPermission('canCreateFilter');
  const canDeleteFilter = checkPermission('canDeleteFilter');

  return (
    <PageLoader context={context}>
      <FilterLists canCreateFilter={canCreateFilter} canDeleteFilter={canDeleteFilter} />
    </PageLoader>
  );
};
