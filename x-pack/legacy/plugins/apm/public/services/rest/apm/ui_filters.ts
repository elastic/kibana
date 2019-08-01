/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callApmApi } from '../callApi';
import { environmentsRoute } from '../../../../server/routes/ui_filters/environments_route';

export async function loadEnvironmentsFilter({
  serviceName,
  start,
  end
}: {
  serviceName?: string;
  start: string;
  end: string;
}) {
  return callApmApi<typeof environmentsRoute>({
    pathname: '/api/apm/ui_filters/environments',
    query: {
      start,
      end,
      serviceName
    }
  });
}
