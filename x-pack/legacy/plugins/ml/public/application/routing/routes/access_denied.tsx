/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { MlRoute, PageLoader, useResolver } from '../router';
import { KibanaConfigTypeFix } from '../../contexts/kibana';
import { Page } from '../../access_denied';

const breadcrumbs = [
  {
    text: i18n.translate('xpack.ml.accessDeniedLabel', {
      defaultMessage: 'Access denied',
    }),
    href: '',
  },
];

export const accessDeniedRoute: MlRoute = {
  path: '/access-denied',
  render: (props, config) => <PageWrapper config={config} />,
  breadcrumbs,
};

const PageWrapper: FC<{ config: KibanaConfigTypeFix }> = ({ config }) => {
  const { context } = useResolver(undefined, config, {});

  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};
