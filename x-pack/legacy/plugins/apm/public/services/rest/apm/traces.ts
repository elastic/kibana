/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TraceAPIResponse } from '../../../../server/lib/traces/get_trace';
import { callApi } from '../callApi';
import { UIFilters } from '../../../../typings/ui-filters';
import { TransactionGroupListAPIResponse } from '../../../../server/routes/transaction_groups/transaction_group_list_route';

export async function loadTrace({
  traceId,
  start,
  end
}: {
  traceId: string;
  start: string;
  end: string;
}) {
  return callApi<TraceAPIResponse>({
    pathname: `/api/apm/traces/${traceId}`,
    query: {
      start,
      end
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
  return callApi<TransactionGroupListAPIResponse>({
    pathname: '/api/apm/traces',
    query: {
      start,
      end,
      uiFilters: JSON.stringify(uiFilters)
    }
  });
}
