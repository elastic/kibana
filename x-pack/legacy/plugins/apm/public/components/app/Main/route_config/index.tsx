/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';
import { legacyDecodeURIComponent } from '../../../shared/Links/url_helpers';
import { ErrorGroupDetails } from '../../ErrorGroupDetails';
import { ServiceDetails } from '../../ServiceDetails';
import { TransactionDetails } from '../../TransactionDetails';
import { Home } from '../Home';
import { BreadcrumbRoute } from '../ProvideBreadcrumbs';
import {
  HOME,
  SERVICES,
  TRACES,
  METRICS,
  ERRORS,
  TRANSACTIONS,
  SERVICE,
  ERROR,
  TRANSACTION_TYPE,
  TRANSACTION_NAME
} from './route_names';

interface RouteParams {
  serviceName: string;
}

const renderAsRedirectTo = (to: string) => {
  return ({ location }: RouteComponentProps<RouteParams>) => (
    <Redirect
      to={{
        ...location,
        pathname: to
      }}
    />
  );
};

export const routes: BreadcrumbRoute[] = [
  {
    exact: true,
    path: '/',
    render: renderAsRedirectTo('/services'),
    breadcrumb: 'APM',
    name: HOME
  },
  {
    exact: true,
    path: '/services',
    component: Home,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.servicesTitle', {
      defaultMessage: 'Services'
    }),
    name: SERVICES
  },
  {
    exact: true,
    path: '/traces',
    component: Home,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.tracesTitle', {
      defaultMessage: 'Traces'
    }),
    name: TRACES
  },
  {
    exact: true,
    path: '/:serviceName',
    breadcrumb: ({ match }) => match.params.serviceName,
    render: (props: RouteComponentProps<RouteParams>) =>
      renderAsRedirectTo(`/${props.match.params.serviceName}/transactions`)(
        props
      ),
    name: SERVICE
  },
  {
    exact: true,
    path: '/:serviceName/errors/:groupId',
    component: ErrorGroupDetails,
    breadcrumb: ({ match }) => match.params.groupId,
    name: ERROR
  },
  {
    exact: true,
    path: '/:serviceName/errors',
    component: ServiceDetails,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.errorsTitle', {
      defaultMessage: 'Errors'
    }),
    name: ERRORS
  },
  {
    exact: true,
    path: '/:serviceName/transactions',
    component: ServiceDetails,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.transactionsTitle', {
      defaultMessage: 'Transactions'
    }),
    name: TRANSACTIONS
  },
  // Have to split this out as its own route to prevent duplicate breadcrumbs from both matching
  // if we use :transactionType? as a single route here
  {
    exact: true,
    path: '/:serviceName/transactions/:transactionType',
    component: ServiceDetails,
    breadcrumb: null,
    name: TRANSACTION_TYPE
  },
  {
    exact: true,
    path: '/:serviceName/metrics',
    component: ServiceDetails,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.metricsTitle', {
      defaultMessage: 'Metrics'
    }),
    name: METRICS
  },
  {
    exact: true,
    path: '/:serviceName/transactions/:transactionType/:transactionName',
    component: TransactionDetails,
    breadcrumb: ({ match }) =>
      legacyDecodeURIComponent(match.params.transactionName) || '',
    name: TRANSACTION_NAME
  }
];
