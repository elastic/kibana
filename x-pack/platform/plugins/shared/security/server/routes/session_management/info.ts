/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '..';
import { SESSION_EXPIRATION_WARNING_MS } from '../../../common/constants';
import { LogoutReason, type SessionInfo } from '../../../common/types';

/**
 * Defines routes required for the session info.
 */
export function defineSessionInfoRoutes({ router, getSession }: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/session',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization because a valid session is required, and it does not return sensative session information',
        },
      },
      validate: false,
    },
    async (_context, request, response) => {
      const { value: sessionValue } = await getSession().get(request);
      if (sessionValue) {
        const expirationTime =
          sessionValue.idleTimeoutExpiration !== null && sessionValue.lifespanExpiration !== null
            ? Math.min(sessionValue.idleTimeoutExpiration, sessionValue.lifespanExpiration)
            : sessionValue.idleTimeoutExpiration ?? sessionValue.lifespanExpiration;

        const expirationReason: SessionInfo['expirationReason'] | undefined =
          expirationTime !== null
            ? expirationTime === sessionValue.lifespanExpiration
              ? LogoutReason.SESSION_LIFESPAN_TIMEOUT
              : LogoutReason.SESSION_IDLE_TIMEOUT
            : undefined;

        return response.ok({
          body: {
            expiresInMs: expirationTime !== null ? expirationTime - Date.now() : null,
            canBeExtended:
              sessionValue.idleTimeoutExpiration !== null &&
              expirationTime !== null &&
              (sessionValue.lifespanExpiration === null ||
                expirationTime + SESSION_EXPIRATION_WARNING_MS < sessionValue.lifespanExpiration),
            provider: sessionValue.provider,
            ...(expirationReason !== undefined ? { expirationReason } : {}),
          } as SessionInfo,
        });
      }

      return response.noContent();
    }
  );
}
