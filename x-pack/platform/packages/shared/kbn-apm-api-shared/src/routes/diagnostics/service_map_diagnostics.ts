/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { ServiceMapDiagnosticResponse } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeRt } from '../../default_api_types';

export const serviceMapDiagnosticsRoute = defineRoute<ServiceMapDiagnosticResponse>()({
  endpoint: 'POST /internal/apm/diagnostics/service-map',
  params: t.type({
    body: t.intersection([
      rangeRt,
      t.type({
        sourceNode: t.string,
        destinationNode: t.string,
      }),
      t.partial({
        traceId: t.string,
      }),
    ]),
  }),
});
