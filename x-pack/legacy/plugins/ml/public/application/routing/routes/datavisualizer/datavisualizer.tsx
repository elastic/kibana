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

// @ts-ignore
import queryString from 'query-string';
import { MlRoute, PageLoader } from '../../router';
import { useResolver } from '../../router';
import { DatavisualizerSelector } from '../../../datavisualizer';

import { checkBasicLicense } from '../../../license/check_license';
import { checkFindFileStructurePrivilege } from '../../../privilege/check_privilege';
import { DATA_VISUALIZER_BREADCRUMB, ML_BREADCRUMB } from '../../breadcrumbs';

const breadcrumbs = [ML_BREADCRUMB, DATA_VISUALIZER_BREADCRUMB];

export const selectorRoute: MlRoute = {
  path: '/datavisualizer',
  render: (props: any, config: any) => <PageWrapper config={config} {...props} />,
  breadcrumbs,
};

const PageWrapper: FC<{ location: any; config: any }> = ({ location, config }) => {
  const { index } = queryString.parse(location.search);
  const { context } = useResolver(index, config, {
    checkBasicLicense,
    checkFindFileStructurePrivilege,
  });
  return (
    <PageLoader context={context}>
      <DatavisualizerSelector />
    </PageLoader>
  );
};
