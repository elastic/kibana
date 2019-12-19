/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpStart } from 'kibana/public';
import { callApi } from './callApi';

export interface LicenseApiResponse {
  license: {
    is_active: boolean;
  };
  features: {
    beats_management?: Record<string, unknown>;
    graph?: Record<string, unknown>;
    grokdebugger?: Record<string, unknown>;
    index_management?: Record<string, unknown>;
    logstash?: Record<string, unknown>;
    ml?: {
      is_available: boolean;
      license_type: number;
      has_expired: boolean;
      enable_links: boolean;
      show_links: boolean;
    };
    reporting?: Record<string, unknown>;
    rollup?: Record<string, unknown>;
    searchprofiler?: Record<string, unknown>;
    security?: Record<string, unknown>;
    spaces?: Record<string, unknown>;
    tilemap?: Record<string, unknown>;
    watcher?: {
      is_available: boolean;
      enable_links: boolean;
      show_links: boolean;
    };
  };
}

export async function loadLicense(http: HttpStart) {
  return callApi<LicenseApiResponse>(http, {
    pathname: `/api/xpack/v1/info`
  });
}
