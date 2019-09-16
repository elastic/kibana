/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { Legacy } from 'kibana';
import { setupRequest } from '../lib/helpers/setup_request';
import { getTransactionCharts } from '../lib/transactions/charts';
import { getTransactionDistribution } from '../lib/transactions/distribution';
import { getTransactionBreakdown } from '../lib/transactions/breakdown';
import { getTransactionGroupList } from '../lib/transaction_groups';
import { createRoute } from './create_route';
import { uiFiltersRt, rangeRt } from './default_api_types';
import { getTransactionAvgDurationByCountry } from '../lib/transactions/avg_duration_by_country';

export const transactionGroupsRoute = createRoute(() => ({
  path: '/api/apm/services/{serviceName}/transaction_groups',
  params: {
    path: t.type({
      serviceName: t.string
    }),
    query: t.intersection([
      t.type({
        transactionType: t.string
      }),
      uiFiltersRt,
      rangeRt
    ])
  },
  handler: async (req, { path, query }) => {
    const { serviceName } = path;
    const { transactionType } = query;
    const setup = await setupRequest(req);

    return getTransactionGroupList(
      {
        type: 'top_transactions',
        serviceName,
        transactionType
      },
      setup
    );
  }
}));

export const transactionGroupsChartsRoute = createRoute(core => {
  const PathRT = t.type({
    serviceName: t.string
  });
  const QueryRT = t.intersection([
    t.partial({
      transactionType: t.string,
      transactionName: t.string
    }),
    uiFiltersRt,
    rangeRt
  ]);
  interface Params {
    path: t.TypeOf<typeof PathRT>;
    query: t.TypeOf<typeof QueryRT>;
  }
  const handler = async (req: Legacy.Request, { path, query }: Params) => {
    const setup = await setupRequest(req);
    const { serviceName } = path;
    const { transactionType, transactionName } = query;

    return getTransactionCharts({
      serviceName,
      transactionType,
      transactionName,
      setup
    });
  };
  // The Infra UI needs to be able to make requests to this endpoint without
  // going through the server's router (via server.inject).
  core.http.server.expose('getTransactionGroupsCharts', handler);
  return {
    path: '/api/apm/services/{serviceName}/transaction_groups/charts',
    params: {
      path: PathRT,
      query: QueryRT
    },
    handler
  };
});

export const transactionGroupsDistributionRoute = createRoute(() => ({
  path: '/api/apm/services/{serviceName}/transaction_groups/distribution',
  params: {
    path: t.type({
      serviceName: t.string
    }),
    query: t.intersection([
      t.type({
        transactionType: t.string,
        transactionName: t.string
      }),
      t.partial({
        transactionId: t.string,
        traceId: t.string
      }),
      uiFiltersRt,
      rangeRt
    ])
  },
  handler: async (req, { path, query }) => {
    const setup = await setupRequest(req);
    const { serviceName } = path;
    const {
      transactionType,
      transactionName,
      transactionId = '',
      traceId = ''
    } = query;

    return getTransactionDistribution({
      serviceName,
      transactionType,
      transactionName,
      transactionId,
      traceId,
      setup
    });
  }
}));

export const transactionGroupsBreakdownRoute = createRoute(() => ({
  path: '/api/apm/services/{serviceName}/transaction_groups/breakdown',
  params: {
    path: t.type({
      serviceName: t.string
    }),
    query: t.intersection([
      t.type({
        transactionType: t.string
      }),
      t.partial({
        transactionName: t.string
      }),
      uiFiltersRt,
      rangeRt
    ])
  },
  handler: async (req, { path, query }) => {
    const setup = await setupRequest(req);
    const { serviceName } = path;
    const { transactionName, transactionType } = query;

    return getTransactionBreakdown({
      serviceName,
      transactionName,
      transactionType,
      setup
    });
  }
}));

export const transactionGroupsAvgDurationByCountry = createRoute(() => ({
  path: `/api/apm/services/{serviceName}/transaction_groups/avg_duration_by_country`,
  params: {
    path: t.type({
      serviceName: t.string
    }),
    query: t.intersection([uiFiltersRt, rangeRt])
  },
  handler: async (req, { path, query }) => {
    const setup = await setupRequest(req);
    const { serviceName } = path;

    return getTransactionAvgDurationByCountry({
      serviceName,
      setup
    });
  }
}));
