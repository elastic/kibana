/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { omit } from 'lodash';
import { setupRequest, Setup } from '../lib/helpers/setup_request';
import { getEnvironments } from '../lib/ui_filters/get_environments';
import { Projection } from '../../common/projections/typings';
import {
  localUIFilterNames,
  LocalUIFilterName
} from '../lib/ui_filters/local_ui_filters/config';
import { getUiFiltersES } from '../lib/helpers/convert_ui_filters/get_ui_filters_es';
import { getLocalUIFilters } from '../lib/ui_filters/local_ui_filters';
import { getServicesProjection } from '../../common/projections/services';
import { getTransactionGroupsProjection } from '../../common/projections/transaction_groups';
import { getMetricsProjection } from '../../common/projections/metrics';
import { getErrorGroupsProjection } from '../../common/projections/errors';
import { getTransactionsProjection } from '../../common/projections/transactions';
import { createRoute } from './create_route';
import { uiFiltersRt, rangeRt } from './default_api_types';
import { jsonRt } from '../../common/runtime_types/json_rt';

export const uiFiltersEnvironmentsRoute = createRoute(() => ({
  path: '/api/apm/ui_filters/environments',
  params: {
    query: t.intersection([
      t.partial({
        serviceName: t.string
      }),
      rangeRt
    ])
  },
  handler: async (req, { query }) => {
    const setup = await setupRequest(req);
    const { serviceName } = query;
    return getEnvironments(setup, serviceName);
  }
}));

const filterNamesRt = t.type({
  filterNames: jsonRt.pipe(
    t.array(
      t.keyof(Object.fromEntries(
        localUIFilterNames.map(filterName => [filterName, null])
      ) as Record<LocalUIFilterName, null>)
    )
  )
});

const localUiBaseQueryRt = t.intersection([
  filterNamesRt,
  uiFiltersRt,
  rangeRt
]);

function createLocalFiltersRoute<
  TPath extends string,
  TProjection extends Projection,
  TQueryRT extends t.HasProps
>({
  path,
  getProjection,
  queryRt
}: {
  path: TPath;
  getProjection: GetProjection<TProjection, TQueryRT & BaseQueryType>;
  queryRt: TQueryRT;
}) {
  return createRoute(() => ({
    path,
    params: {
      query: queryRt
        ? t.intersection([queryRt, localUiBaseQueryRt])
        : localUiBaseQueryRt
    },
    handler: async (req, { query }: { query: t.TypeOf<BaseQueryType> }) => {
      const setup = await setupRequest(req);

      const { uiFilters, filterNames } = query;

      const parsedUiFilters = JSON.parse(uiFilters);

      const projection = getProjection({
        query,
        setup: {
          ...setup,
          uiFiltersES: await getUiFiltersES(
            req.server,
            omit(parsedUiFilters, filterNames)
          )
        }
      });

      return getLocalUIFilters({
        server: req.server,
        projection,
        setup,
        uiFilters: parsedUiFilters,
        localFilterNames: filterNames
      });
    }
  }));
}

export const servicesLocalFiltersRoute = createLocalFiltersRoute({
  path: `/api/apm/ui_filters/local_filters/services`,
  getProjection: ({ setup }) => getServicesProjection({ setup }),
  queryRt: t.type({})
});

export const transactionGroupsLocalFiltersRoute = createLocalFiltersRoute({
  path: '/api/apm/ui_filters/local_filters/transactionGroups',
  getProjection: ({ setup, query }) => {
    const { transactionType, serviceName, transactionName } = query;
    return getTransactionGroupsProjection({
      setup,
      options: {
        type: 'top_transactions',
        transactionType,
        serviceName,
        transactionName
      }
    });
  },
  queryRt: t.intersection([
    t.type({
      serviceName: t.string,
      transactionType: t.string
    }),
    t.partial({
      transactionName: t.string
    })
  ])
});

export const tracesLocalFiltersRoute = createLocalFiltersRoute({
  path: '/api/apm/ui_filters/local_filters/traces',
  getProjection: ({ setup }) => {
    return getTransactionGroupsProjection({
      setup,
      options: { type: 'top_traces' }
    });
  },
  queryRt: t.type({})
});

export const transactionsLocalFiltersRoute = createLocalFiltersRoute({
  path: '/api/apm/ui_filters/local_filters/transactions',
  getProjection: ({ setup, query }) => {
    const { transactionType, serviceName, transactionName } = query;
    return getTransactionsProjection({
      setup,
      transactionType,
      serviceName,
      transactionName
    });
  },
  queryRt: t.type({
    transactionType: t.string,
    transactionName: t.string,
    serviceName: t.string
  })
});

export const metricsLocalFiltersRoute = createLocalFiltersRoute({
  path: '/api/apm/ui_filters/local_filters/metrics',
  getProjection: ({ setup, query }) => {
    const { serviceName } = query;
    return getMetricsProjection({
      setup,
      serviceName
    });
  },
  queryRt: t.type({
    serviceName: t.string
  })
});

export const errorGroupsLocalFiltersRoute = createLocalFiltersRoute({
  path: '/api/apm/ui_filters/local_filters/errorGroups',
  getProjection: ({ setup, query }) => {
    const { serviceName } = query;
    return getErrorGroupsProjection({
      setup,
      serviceName
    });
  },
  queryRt: t.type({
    serviceName: t.string
  })
});

type BaseQueryType = typeof localUiBaseQueryRt;

type GetProjection<
  TProjection extends Projection,
  TQueryRT extends t.HasProps
> = ({
  query,
  setup
}: {
  query: t.TypeOf<TQueryRT>;
  setup: Setup;
}) => TProjection;
