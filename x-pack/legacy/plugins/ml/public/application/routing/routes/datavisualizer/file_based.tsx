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
import { FileDataVisualizerPage } from '../../../datavisualizer/file_based/file_datavisualizer';

import { checkBasicLicense } from '../../../license/check_license';
import { checkFindFileStructurePrivilege } from '../../../privilege/check_privilege';
import { loadIndexPatterns } from '../../../util/index_utils';

import { getMlNodeCount } from '../../../ml_nodes_check';

export const fileBasedRoute: MlRoute = {
  path: '/filedatavisualizer',
  render: (props: any, config: any) => <PageWrapper config={config} {...props} />,
};

const PageWrapper: FC<{ location: any; config: any }> = ({ location, config }) => {
  const { index } = queryString.parse(location.search);
  const { context } = useResolver(index, config, {
    checkBasicLicense,
    loadIndexPatterns,
    checkFindFileStructurePrivilege,
    getMlNodeCount,
  });
  return (
    <PageLoader context={context}>
      <FileDataVisualizerPage kibanaConfig={config} />
    </PageLoader>
  );
};
