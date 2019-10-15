/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';
import { npStart } from 'ui/new_platform';
import { SERVICE_NODE_NAME_MISSING } from '../../../../../common/service_nodes';
import { ErrorGroupDetails } from '../../ErrorGroupDetails';
import { ServiceDetails } from '../../ServiceDetails';
import { TransactionDetails } from '../../TransactionDetails';
import { Home } from '../../Home';
import { BreadcrumbRoute } from '../ProvideBreadcrumbs';
import { RouteName } from './route_names';
import { AgentConfigurations } from '../../Settings/AgentConfigurations';
import { toQuery } from '../../../shared/Links/url_helpers';
import { ServiceNodeMetrics } from '../../ServiceNodeMetrics';
import { resolveUrlParams } from '../../../../context/UrlParamsContext/resolveUrlParams';
import { UNIDENTIFIED_SERVICE_NODES_LABEL } from '../../../../../common/i18n';

const metricsBreadcrumb = i18n.translate('xpack.apm.breadcrumb.metricsTitle', {
  defaultMessage: 'Metrics'
});

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
    component: () => <Home tab="services" />,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.servicesTitle', {
      defaultMessage: 'Services'
    }),
    name: RouteName.SERVICES
  },
  {
    exact: true,
    path: '/traces',
    component: () => <Home tab="traces" />,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.tracesTitle', {
      defaultMessage: 'Traces'
    }),
    name: RouteName.TRACES
  },
  {
    exact: true,
    path: '/settings',
    component: AgentConfigurations,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.listSettingsTitle', {
      defaultMessage: 'Settings'
    }),
    name: RouteName.SETTINGS
  },
  {
    exact: true,
    path: '/services/:serviceName',
    breadcrumb: ({ match }) => match.params.serviceName,
    render: (props: RouteComponentProps<RouteParams>) =>
      renderAsRedirectTo(
        `/services/${props.match.params.serviceName}/transactions`
      )(props),
    name: RouteName.SERVICE
  },
  // errors
  {
    exact: true,
    path: '/services/:serviceName/errors/:groupId',
    component: ErrorGroupDetails,
    breadcrumb: ({ match }) => match.params.groupId,
    name: RouteName.ERROR
  },
  {
    exact: true,
    path: '/services/:serviceName/errors',
    component: () => <ServiceDetails tab="errors" />,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.errorsTitle', {
      defaultMessage: 'Errors'
    }),
    name: RouteName.ERRORS
  },
  // transactions
  {
    exact: true,
    path: '/services/:serviceName/transactions',
    component: () => <ServiceDetails tab="transactions" />,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.transactionsTitle', {
      defaultMessage: 'Transactions'
    }),
    name: RouteName.TRANSACTIONS
  },
  // metrics
  {
    exact: true,
    path: '/services/:serviceName/metrics',
    component: () => <ServiceDetails tab="metrics" />,
    breadcrumb: metricsBreadcrumb,
    name: RouteName.METRICS
  },
  // service nodes, only enabled for java agents for now
  {
    exact: true,
    path: '/services/:serviceName/nodes',
    component: () => <ServiceDetails tab="nodes" />,
    breadcrumb: i18n.translate('xpack.apm.breadcrumb.nodesTitle', {
      defaultMessage: 'JVMs'
    }),
    name: RouteName.SERVICE_NODES
  },
  // node metrics
  {
    exact: true,
    path: '/services/:serviceName/nodes/:serviceNodeName/metrics',
    component: () => <ServiceNodeMetrics />,
    breadcrumb: ({ location }) => {
      const { serviceNodeName } = resolveUrlParams(location, {});

      if (serviceNodeName === SERVICE_NODE_NAME_MISSING) {
        return UNIDENTIFIED_SERVICE_NODES_LABEL;
      }

      return serviceNodeName || '';
    },
    name: RouteName.SERVICE_NODE_METRICS
  },
  {
    exact: true,
    path: '/services/:serviceName/transactions/view',
    component: TransactionDetails,
    breadcrumb: ({ location }) => {
      const query = toQuery(location.search);
      return query.transactionName as string;
    },
    name: RouteName.TRANSACTION_NAME
  }
];

if (npStart.core.injectedMetadata.getInjectedVar('apmServiceMapEnabled')) {
  routes.push(
    {
      exact: true,
      path: '/service-map',
      component: () => <Home tab="service-map" />,
      breadcrumb: i18n.translate('xpack.apm.breadcrumb.serviceMapTitle', {
        defaultMessage: 'Service Map'
      }),
      name: RouteName.SERVICE_MAP
    },
    {
      exact: true,
      path: '/services/:serviceName/service-map',
      component: () => <ServiceDetails tab="service-map" />,
      breadcrumb: i18n.translate('xpack.apm.breadcrumb.serviceMapTitle', {
        defaultMessage: 'Service Map'
      }),
      name: RouteName.SINGLE_SERVICE_MAP
    }
  );
}
