/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { MlRoute, PageLoader } from '../router';
import { useResolver } from '../router';
import { KibanaConfigTypeFix } from '../../contexts/kibana';
import { Page } from '../../access_denied';

export const accessDeniedRoute: MlRoute = {
  path: '/access-denied',
  render: (props: any, config: any) => <PageWrapper config={config} />,
};

const PageWrapper: FC<{ config: KibanaConfigTypeFix }> = ({ config }) => {
  const { context } = useResolver(undefined, config, {});

  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};
