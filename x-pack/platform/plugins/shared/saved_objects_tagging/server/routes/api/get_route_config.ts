/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TAGS_API_PATH, TAGS_API_VERSION } from '../../../common/api_constants';

export function getRouteConfig() {
  return {
    basePath: TAGS_API_PATH,
    routeVersion: TAGS_API_VERSION,
    routeConfig: {
      access: 'public',
      options: {
        tags: ['oas-tag:Tags'],
        availability: { since: '9.5.0', stability: 'experimental' },
      },
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on the Saved Objects client for authorization',
        },
      },
    } as const,
  };
}
