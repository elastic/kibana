/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UIFilters } from '../../../../typings/ui-filters';
import { errorGroupListRoute } from '../../../../server/routes/errors/error_group_list_route';
import { errorGroupRoute } from '../../../../server/routes/errors/error_group_route';
import { errorDistributionRoute } from '../../../../server/routes/errors/error_distribution_route';
import { callApmApi } from '../callApi';

export async function loadErrorGroupList({
  serviceName,
  start,
  end,
  uiFilters,
  sortField,
  sortDirection
}: {
  serviceName: string;
  start: string;
  end: string;
  uiFilters: UIFilters;
  sortField?: string;
  sortDirection?: string;
}) {
  return callApmApi<typeof errorGroupListRoute>({
    pathname: `/api/apm/services/${serviceName}/errors`,
    query: {
      start,
      end,
      sortField,
      sortDirection,
      uiFilters: JSON.stringify(uiFilters)
    }
  });
}

export async function loadErrorGroupDetails({
  serviceName,
  start,
  end,
  uiFilters,
  errorGroupId
}: {
  serviceName: string;
  start: string;
  end: string;
  errorGroupId: string;
  uiFilters: UIFilters;
}) {
  return callApmApi<typeof errorGroupRoute>({
    pathname: `/api/apm/services/${serviceName}/errors/${errorGroupId}`,
    query: {
      start,
      end,
      uiFilters: JSON.stringify(uiFilters)
    }
  });
}

export async function loadErrorDistribution({
  serviceName,
  start,
  end,
  uiFilters,
  errorGroupId
}: {
  serviceName: string;
  start: string;
  end: string;
  uiFilters: UIFilters;
  errorGroupId?: string;
}) {
  return callApmApi<typeof errorDistributionRoute>({
    pathname: `/api/apm/services/${serviceName}/errors/distribution`,
    query: {
      start,
      end,
      groupId: errorGroupId,
      uiFilters: JSON.stringify(uiFilters)
    }
  });
}
