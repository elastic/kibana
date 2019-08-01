/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callApmApi } from '../callApi';
import { UIFilters } from '../../../../typings/ui-filters';
import { traceListRoute } from '../../../../server/routes/traces/trace_list_route';
import { traceRoute } from '../../../../server/routes/traces/trace_route';

export async function loadTrace({
  traceId,
  start,
  end
}: {
  traceId: string;
  start: string;
  end: string;
}) {
  return callApmApi<typeof traceRoute>({
    pathname: `/api/apm/traces/${traceId}`,
    query: {
      start,
      end,
      uiFilters: undefined // TODO: should uiFilters be required like this?
    }
  });
}

export async function loadTraceList({
  start,
  end,
  uiFilters
}: {
  start: string;
  end: string;
  uiFilters: UIFilters;
}) {
  return callApmApi<typeof traceListRoute>({
    pathname: '/api/apm/traces',
    query: {
      start,
      end,
      uiFilters: JSON.stringify(uiFilters)
    }
  });
}
