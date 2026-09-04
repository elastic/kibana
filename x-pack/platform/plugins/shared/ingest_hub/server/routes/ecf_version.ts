/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';

import { ECF_LATEST_VERSION_API_PATH } from '../../common/ecf_version_api';
import { getLatestEcfVersion } from '../services/ecf_version';

/**
 * Registers `GET /internal/ingest_hub/ecf/latest_version`.
 *
 * Acts as a server-side proxy for the ECF template on S3, which returns no CORS headers and
 * cannot be fetched directly from the browser. Returns only the resolved semantic version string
 * and its source (`remote` | `fallback`).
 */
export const registerEcfVersionRoute = (router: IRouter, logger: Logger): void => {
  router.get(
    {
      path: ECF_LATEST_VERSION_API_PATH,
      options: { access: 'internal' },
      security: {
        authz: {
          enabled: false,
          reason:
            'Server-side proxy for the publicly accessible ECF CloudFormation template on S3 ' +
            '(no CORS headers prevent direct browser fetch). Returns only a semantic version ' +
            'string — no user data, no secrets. The ECF wizard that invokes this route is ' +
            'already gated by Fleet integrations access controls.',
        },
      },
      validate: false,
    },
    async (_context, _request, response) => {
      const result = await getLatestEcfVersion(logger);
      return response.ok({ body: result });
    }
  );
};
