/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  EVALS_ONLINE_SCORES_PRIVILEGES_URL,
  EvaluationIndices,
  INTERNAL_API_ACCESS,
} from '@kbn/evals-common';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { RouteDependencies } from '../register_routes';
import { getEsErrorLogDetails } from '../utils/get_es_error_log_details';

/**
 * Reports whether the current user can `read` the online scores data stream.
 *
 * Alert rules created from the online evaluation page query that stream with the rule creator's
 * privileges, and Elasticsearch reports a missing `read` privilege as "Unknown index", which the
 * `.es-query` rule treats as "no data". Such a rule would silently never fire, so the UI checks
 * this before offering to create one. Users need a role with `read` on
 * `.evaluation-online-scores` (the stream is hidden, so the grant must name it explicitly or use
 * a pattern that matches hidden indices).
 *
 * Without the security plugin or with Elasticsearch security turned off there is nothing to
 * enforce, so the answer is `true` (same stance as `checkManageEvalsPrivileges`). Any other
 * failure of the privilege check is reported as an error rather than granted.
 */
export const registerGetOnlineScoresPrivilegesRoute = ({
  router,
  logger,
  security,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_ONLINE_SCORES_PRIVILEGES_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
      },
      summary: 'Check read access to the online evaluation scores index',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: false,
      },
      async (context, _request, response) => {
        if (!security?.license.isEnabled()) {
          return response.ok({ body: { has_read: true } });
        }
        try {
          const { elasticsearch } = await context.core;
          // Origin-only under CPS: the online scores data stream is plugin-owned and lives in this project.
          const { index } = await elasticsearch.client.asCurrentUser.security.hasPrivileges({
            index: [{ names: [EvaluationIndices.ONLINE_SCORES], privileges: ['read'] }],
          });
          return response.ok({
            body: { has_read: index[EvaluationIndices.ONLINE_SCORES]?.read === true },
          });
        } catch (error) {
          const { message, meta } = getEsErrorLogDetails(error);
          logger.error(`Failed to check online scores index privileges: ${message}`, meta);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to check online scores index privileges' },
          });
        }
      }
    );
};
