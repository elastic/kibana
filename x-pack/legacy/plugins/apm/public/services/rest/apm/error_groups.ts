/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ErrorDistributionAPIResponse } from '../../../../server/lib/errors/distribution/get_distribution';
import { ErrorGroupAPIResponse } from '../../../../server/lib/errors/get_error_group';
import { ErrorGroupListAPIResponse } from '../../../../server/lib/errors/get_error_groups';
import { callApi } from '../callApi';
import { getUiFiltersES } from '../../ui_filters/get_ui_filters_es';
import { UIFilters } from '../../../../typings/ui-filters';

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
  return callApi<ErrorGroupListAPIResponse>({
    pathname: `/api/apm/services/${serviceName}/errors`,
    query: {
      start,
      end,
      sortField,
      sortDirection,
      uiFiltersES: await getUiFiltersES(uiFilters)
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
  return callApi<ErrorGroupAPIResponse>({
    pathname: `/api/apm/services/${serviceName}/errors/${errorGroupId}`,
    query: {
      start,
      end,
      uiFiltersES: await getUiFiltersES(uiFilters)
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
  return callApi<ErrorDistributionAPIResponse>({
    pathname: `/api/apm/services/${serviceName}/errors/distribution`,
    query: {
      start,
      end,
      groupId: errorGroupId,
      uiFiltersES: await getUiFiltersES(uiFilters)
    }
  });
}
