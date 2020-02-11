/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'query-string';
import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { Page } from '../../../datavisualizer/index_based';

import { checkBasicLicense } from '../../../license/check_license';
import { checkGetJobsPrivilege } from '../../../privilege/check_privilege';
import { loadIndexPatterns } from '../../../util/index_utils';
import { checkMlNodesAvailable } from '../../../ml_nodes_check';
import { DATA_VISUALIZER_BREADCRUMB, ML_BREADCRUMB } from '../../breadcrumbs';

const breadcrumbs = [
  ML_BREADCRUMB,
  DATA_VISUALIZER_BREADCRUMB,
  {
    text: i18n.translate('xpack.ml.dataFrameAnalyticsBreadcrumbs.indexLabel', {
      defaultMessage: 'Index',
    }),
    href: '',
  },
];

export const indexBasedRoute: MlRoute = {
  path: '/jobs/new_job/datavisualizer',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs,
};

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { index, savedSearchId }: Record<string, any> = parse(location.search, { sort: false });
  const { context } = useResolver(index, savedSearchId, deps.config, {
    checkBasicLicense,
    loadIndexPatterns: () => loadIndexPatterns(deps.indexPatterns),
    checkGetJobsPrivilege,
    checkMlNodesAvailable,
  });

  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};
