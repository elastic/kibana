/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';

// @ts-ignore
import queryString from 'query-string';
import { MlRoute, PageLoader } from '../../router';
import { useResolver } from '../../router';
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
  render: (props: any, config: any) => <PageWrapper config={config} {...props} />,
  breadcrumbs,
};

const PageWrapper: FC<{ location: any; config: any }> = ({ location, config }) => {
  const { index } = queryString.parse(location.search);
  const { context } = useResolver(index, config, {
    checkBasicLicense,
    loadIndexPatterns,
    checkGetJobsPrivilege,
    checkMlNodesAvailable,
  });

  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};
