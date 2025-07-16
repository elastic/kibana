/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';

/**
 * Constructs the URL for the connectors management page
 * @param http - Kibana HTTP service
 * @returns The full URL path to the connectors management page
 */
export function getConnectorsManagementHref(http: HttpStart): string {
  return http.basePath.prepend(
    '/app/management/insightsAndAlerting/triggersActionsConnectors/connectors'
  );
}
