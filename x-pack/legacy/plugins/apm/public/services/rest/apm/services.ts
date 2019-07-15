/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServiceAPIResponse } from '../../../../server/lib/services/get_service';
import { ServiceListAPIResponse } from '../../../../server/lib/services/get_services';
import { callApi } from '../callApi';
import { getUiFiltersES } from '../../ui_filters/get_ui_filters_es';
import { UIFilters } from '../../../../typings/ui-filters';
import { ServiceMapAPIResponse } from '../../../../server/lib/services/map';

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
      uiFiltersES: await getUiFiltersES(uiFilters)
    }
  });
}

export async function loadServiceDetails({
  serviceName,
  start,
  end,
  uiFilters
}: {
  serviceName: string;
  start: string;
  end: string;
  uiFilters: UIFilters;
}) {
  return callApi<ServiceAPIResponse>({
    pathname: `/api/apm/services/${serviceName}`,
    query: {
      start,
      end,
      uiFiltersES: await getUiFiltersES(uiFilters)
    }
  });
}

export async function loadServiceMap({
  start,
  end,
  uiFilters,
  serviceName
}: {
  start: string;
  end: string;
  uiFilters: UIFilters;
  serviceName?: string;
}) {
  return callApi<ServiceMapAPIResponse>({
    pathname: '/api/apm/services/map',
    query: {
      start,
      end,
      serviceName,
      uiFiltersES: await getUiFiltersES(uiFilters)
    }
  });
}
