/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

import { schema } from '@kbn/config-schema';
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';
import type { Logger } from '@kbn/logging';

import type { RouteDefinitionParams } from '..';
import type { AuthenticationTypeAnalyticsEvent } from '../../analytics';
import { HTTPAuthenticationProvider } from '../../authentication';
import { getDetailedErrorMessage, wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

/**
 * A minimum interval between usage collection of the authentication type for
 * the Kibana interactive user.
 */
const MINIMUM_ELAPSED_TIME_HOURS = 12;

export function defineRecordAnalyticsOnAuthTypeRoutes({
  getAuthenticationService,
  router,
  analyticsService,
  logger,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/analytics/_record_auth_type',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates authorization to the scoped ES cluster client of the internal authentication service',
        },
      },
      validate: {
        body: schema.nullable(
          schema.object({ signature: schema.string(), timestamp: schema.number() })
        ),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const authUser = getAuthenticationService().getCurrentUser(request);
        if (!authUser) {
          logger.warn('Cannot record authentication type: current user could not be retrieved.');
          return response.noContent();
        }

        let timestamp = new Date().getTime();
        const {
          signature: previouslyRegisteredSignature,
          timestamp: previousRegistrationTimestamp,
        } = request.body || { authTypeHash: '', timestamp };

        const authTypeEventToReport: AuthenticationTypeAnalyticsEvent = {
          authenticationProviderType: authUser.authentication_provider.type,
          authenticationRealmType: authUser.authentication_realm.type,
          httpAuthenticationScheme:
            authUser.authentication_provider.type === HTTPAuthenticationProvider.type
              ? HTTPAuthorizationHeader.parseFromRequest(request)?.scheme
              : undefined,
        };

        // We calculate the "signature" of the authentication type event to avoid reporting the
        // same events too frequently.
        const signature = createHash('sha3-256')
          .update(authUser.username)
          .update(authTypeEventToReport.authenticationProviderType)
          .update(authTypeEventToReport.authenticationRealmType)
          .update(authTypeEventToReport.httpAuthenticationScheme ?? '')
          .digest('hex');

        const elapsedTimeInHrs = (timestamp - previousRegistrationTimestamp) / (1000 * 60 * 60);
        if (
          elapsedTimeInHrs >= MINIMUM_ELAPSED_TIME_HOURS ||
          previouslyRegisteredSignature !== signature
        ) {
          analyticsService.reportAuthenticationTypeEvent(authTypeEventToReport);

          logApiKeyWithInteractiveUserDeprecated(
            authTypeEventToReport.httpAuthenticationScheme,
            logger
          );
        } else {
          timestamp = previousRegistrationTimestamp;
        }

        return response.ok({ body: { signature, timestamp } });
      } catch (err) {
        logger.error(
          `Failed to record authentication type for the user: ${getDetailedErrorMessage(err)}`
        );
        return response.customError(wrapIntoCustomErrorResponse(err));
      }
    })
  );
}

/**
 * API Key authentication by interactive users is deprecated, this method logs a deprecation warning.
 *
 * @param httpAuthenticationScheme A string representing the authentication type event's scheme (ApiKey, etc.) by an interactive user.
 * @param logger A reference to the Logger to log the deprecation message.
 */
function logApiKeyWithInteractiveUserDeprecated(
  httpAuthenticationScheme: string = '',
  logger: Logger
): void {
  const isUsingApiKey = httpAuthenticationScheme?.toLowerCase() === 'apikey';

  if (isUsingApiKey) {
    logger.warn(
      `API keys are intended for programmatic access. Do not use API keys to authenticate access via a web browser.`,
      { tags: ['deprecation'] }
    );
  }
}
