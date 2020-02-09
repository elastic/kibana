/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { MlRoute, PageLoader, PageProps } from '../router';
import { useResolver } from '../use_resolver';
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
  render: (props, config, deps) => <PageWrapper config={config} {...props} deps={deps} />,
  breadcrumbs,
};

const PageWrapper: FC<PageProps> = ({ config }) => {
  const { context } = useResolver(undefined, undefined, config, {});

  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};
