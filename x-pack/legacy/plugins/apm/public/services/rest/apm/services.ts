/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callApmApi } from '../callApi';
import { UIFilters } from '../../../../typings/ui-filters';
import { serviceListRoute } from '../../../../server/routes/services/service_list_route';
import { serviceAgentNameRoute } from '../../../../server/routes/services/service_agent_name_route';
import { serviceTransactionTypesRoute } from '../../../../server/routes/services/service_transaction_types_routes';

export async function loadServiceList({
  start,
  end,
  uiFilters
}: {
  start: string;
  end: string;
  uiFilters: UIFilters;
}) {
  return callApmApi<typeof serviceListRoute>({
    pathname: `/api/apm/services`,
    query: {
      start,
      end,
      uiFilters: JSON.stringify(uiFilters)
    }
  });
}

export async function loadServiceAgentName({
  serviceName,
  start,
  end
}: {
  serviceName: string;
  start: string;
  end: string;
}) {
  const { agentName } = await callApmApi<typeof serviceAgentNameRoute>({
    pathname: `/api/apm/services/${serviceName}/agent_name`,
    query: {
      start,
      end,
      uiFilters: undefined // TODO: should uiFilters be required like this?
    }
  });

  return agentName;
}

export async function loadServiceTransactionTypes({
  serviceName,
  start,
  end
}: {
  serviceName: string;
  start: string;
  end: string;
}) {
  const { transactionTypes } = await callApmApi<
    typeof serviceTransactionTypesRoute
  >({
    pathname: `/api/apm/services/${serviceName}/transaction_types`,
    query: {
      start,
      end,
      uiFilters: undefined // TODO: should uiFilters be required like this?
    }
  });
  return transactionTypes;
}
