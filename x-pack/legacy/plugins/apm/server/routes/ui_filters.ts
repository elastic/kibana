/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import Joi, { Schema } from 'joi';
import { InternalCoreSetup } from 'src/core/server';
import { omit } from 'lodash';
import { withDefaultValidators } from '../lib/helpers/input_validation';
import { setupRequest, Setup } from '../lib/helpers/setup_request';
import { getEnvironments } from '../lib/ui_filters/get_environments';
import { PROJECTION, Projection } from '../../common/projections/typings';
import {
  LocalUIFilterName,
  localUIFilterNames
} from '../lib/ui_filters/local_ui_filters/config';
import { getUiFiltersES } from '../lib/helpers/convert_ui_filters/get_ui_filters_es';
import { getLocalUIFilters } from '../lib/ui_filters/local_ui_filters';
import { getServicesProjection } from '../../common/projections/services';
import { getTransactionGroupsProjection } from '../../common/projections/transaction_groups';
import { getMetricsProjection } from '../../common/projections/metrics';
import { getErrorGroupsProjection } from '../../common/projections/errors';
import { getTransactionsProjection } from '../../common/projections/transactions';

const defaultErrorHandler = (err: Error) => {
  // eslint-disable-next-line
  console.error(err.stack);
  throw Boom.boomify(err, { statusCode: 400 });
};

export function initUIFiltersApi(core: InternalCoreSetup) {
  const { server } = core.http;
  server.route({
    method: 'GET',
    path: '/api/apm/ui_filters/environments',
    options: {
      validate: {
        query: withDefaultValidators({
          serviceName: Joi.string()
        })
      },
      tags: ['access:apm']
    },
    handler: async req => {
      const setup = await setupRequest(req);
      const { serviceName } = req.query as {
        serviceName?: string;
      };
      return getEnvironments(setup, serviceName).catch(defaultErrorHandler);
    }
  });

  const createLocalFiltersEndpoint = ({
    name,
    getProjection,
    validators
  }: {
    name: PROJECTION;
    getProjection: ({
      setup,
      query
    }: {
      setup: Setup;
      query: Record<string, any>;
    }) => Projection;
    validators?: Record<string, Schema>;
  }) => {
    server.route({
      method: 'GET',
      path: `/api/apm/ui_filters/local_filters/${name}`,
      options: {
        validate: {
          query: withDefaultValidators({
            filterNames: Joi.array()
              .items(localUIFilterNames)
              .required(),
            ...validators
          })
        },
        tags: ['access:apm']
      },
      handler: async req => {
        const setup = await setupRequest(req);

        const { uiFilters, filterNames } = (req.query as unknown) as {
          uiFilters: string;
          filterNames: LocalUIFilterName[];
        };

        const parsedUiFilters = JSON.parse(uiFilters);

        const projection = getProjection({
          query: req.query as Record<string, any>,
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
        }).catch(defaultErrorHandler);
      }
    });
  };

  createLocalFiltersEndpoint({
    name: PROJECTION.SERVICES,
    getProjection: ({ setup }) => {
      return getServicesProjection({ setup });
    }
  });

  createLocalFiltersEndpoint({
    name: PROJECTION.TRACES,
    getProjection: ({ setup }) => {
      return getTransactionGroupsProjection({
        setup,
        options: { type: 'top_traces' }
      });
    }
  });

  createLocalFiltersEndpoint({
    name: PROJECTION.TRANSACTION_GROUPS,
    getProjection: ({ setup, query }) => {
      const { transactionType, serviceName, transactionName } = query as {
        transactionType: string;
        serviceName: string;
        transactionName?: string;
      };
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
    validators: {
      serviceName: Joi.string().required(),
      transactionType: Joi.string().required(),
      transactionName: Joi.string()
    }
  });

  createLocalFiltersEndpoint({
    name: PROJECTION.TRANSACTIONS,
    getProjection: ({ setup, query }) => {
      const { transactionType, serviceName, transactionName } = query as {
        transactionType: string;
        serviceName: string;
        transactionName: string;
      };
      return getTransactionsProjection({
        setup,
        transactionType,
        serviceName,
        transactionName
      });
    },
    validators: {
      serviceName: Joi.string().required(),
      transactionType: Joi.string().required(),
      transactionName: Joi.string().required()
    }
  });

  createLocalFiltersEndpoint({
    name: PROJECTION.METRICS,
    getProjection: ({ setup, query }) => {
      const { serviceName } = query as {
        serviceName: string;
      };
      return getMetricsProjection({
        setup,
        serviceName
      });
    },
    validators: {
      serviceName: Joi.string().required()
    }
  });

  createLocalFiltersEndpoint({
    name: PROJECTION.ERROR_GROUPS,
    getProjection: ({ setup, query }) => {
      const { serviceName } = query as {
        serviceName: string;
      };
      return getErrorGroupsProjection({
        setup,
        serviceName
      });
    },
    validators: {
      serviceName: Joi.string().required()
    }
  });
}
