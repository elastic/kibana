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
import { DatavisualizerSelector } from '../../../datavisualizer/datavisualizer_selector';

import { checkBasicLicense } from '../../../license/check_license';
import { checkFindFileStructurePrivilege } from '../../../privilege/check_privilege';

export const selectorRoute: MlRoute = {
  path: '/datavisualizer',
  render: (props: any, config: any) => <PageWrapper config={config} {...props} />,
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
