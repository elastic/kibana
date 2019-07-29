/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServiceAgentNameAPIResponse } from '../../../../server/lib/services/get_service_agent_name';
import { ServiceListAPIResponse } from '../../../../server/lib/services/get_services';
import { callApi } from '../callApi';
import { UIFilters } from '../../../../typings/ui-filters';
import { ServiceTransactionTypesAPIResponse } from '../../../../server/lib/services/get_service_transaction_types';

export async function loadServiceList({
  start,
  end,
  uiFilters
}: {
  start: string;
  end: string;
  uiFilters: UIFilters;
}) {
  return callApi<ServiceListAPIResponse>({
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
  const { agentName } = await callApi<ServiceAgentNameAPIResponse>({
    pathname: `/api/apm/services/${serviceName}/agent_name`,
    query: {
      start,
      end
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
  const { transactionTypes } = await callApi<
    ServiceTransactionTypesAPIResponse
  >({
    pathname: `/api/apm/services/${serviceName}/transaction_types`,
    query: {
      start,
      end
    }
  });
  return transactionTypes;
}
