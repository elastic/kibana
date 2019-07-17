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
import { RouteName } from './route_names';
import { SettingsList } from '../../Settings/SettingsList';

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
    name: RouteName.HOME
  },
  {
    exact: true,
    path: '/services',
    component: Home,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.servicesTitle', {
      defaultMessage: 'Services'
    }),
    name: RouteName.SERVICES
  },
  {
    exact: true,
    path: '/settings',
    component: SettingsList,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.listSettingsTitle', {
      defaultMessage: 'Settings'
    }),
    name: RouteName.SETTINGS
  },
  {
    exact: true,
    path: '/traces',
    component: Home,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.tracesTitle', {
      defaultMessage: 'Traces'
    }),
    name: RouteName.TRACES
  },
  {
    exact: true,
    path: '/:serviceName',
    breadcrumb: ({ match }) => match.params.serviceName,
    render: (props: RouteComponentProps<RouteParams>) =>
      renderAsRedirectTo(`/${props.match.params.serviceName}/transactions`)(
        props
      ),
    name: RouteName.SERVICE
  },
  {
    exact: true,
    path: '/:serviceName/errors/:groupId',
    component: ErrorGroupDetails,
    breadcrumb: ({ match }) => match.params.groupId,
    name: RouteName.ERROR
  },
  {
    exact: true,
    path: '/:serviceName/errors',
    component: ServiceDetails,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.errorsTitle', {
      defaultMessage: 'Errors'
    }),
    name: RouteName.ERRORS
  },
  {
    exact: true,
    path: '/:serviceName/transactions',
    component: ServiceDetails,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.transactionsTitle', {
      defaultMessage: 'Transactions'
    }),
    name: RouteName.TRANSACTIONS
  },
  // Have to split this out as its own route to prevent duplicate breadcrumbs from both matching
  // if we use :transactionType? as a single route here
  {
    exact: true,
    path: '/:serviceName/transactions/:transactionType',
    component: ServiceDetails,
    breadcrumb: null,
    name: RouteName.TRANSACTION_TYPE
  },
  {
    exact: true,
    path: '/:serviceName/metrics',
    component: ServiceDetails,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.metricsTitle', {
      defaultMessage: 'Metrics'
    }),
    name: RouteName.METRICS
  },
  {
    exact: true,
    path: '/:serviceName/transactions/:transactionType/:transactionName',
    component: TransactionDetails,
    breadcrumb: ({ match }) =>
      legacyDecodeURIComponent(match.params.transactionName) || '',
    name: RouteName.TRANSACTION_NAME
  }
];
