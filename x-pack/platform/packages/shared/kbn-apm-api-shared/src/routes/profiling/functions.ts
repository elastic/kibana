/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import type { TopNFunctions } from '@kbn/profiling-utils';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt } from '../../default_api_types';

export type ServicesFunctionsResponse = TopNFunctions;

export const servicesFunctionsRoute = defineRoute<ServicesFunctionsResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/profiling/functions',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      environmentRt,
      rangeRt,
      t.partial({ transactionName: t.string }),
      t.type({
        startIndex: toNumberRt,
        endIndex: toNumberRt,
        transactionType: t.string,
      }),
      kueryRt,
    ]),
  }),
});
