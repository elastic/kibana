/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';

import type { RouteDefinitionParams } from '..';
import { SAMLAuthenticationProvider, SAMLLogin } from '../../authentication';
import { ROUTE_TAG_AUTH_FLOW, ROUTE_TAG_CAN_REDIRECT } from '../tags';

/**
 * Defines routes required for SAML authentication.
 */
export function defineSAMLRoutes({
  router,
  getAuthenticationService,
  basePath,
  logger,
  buildFlavor,
  docLinks,
}: RouteDefinitionParams) {
  // Generate two identical routes with new and deprecated URL and issue a warning if route with deprecated URL is ever used.
  // For a serverless build, do not register deprecated versioned routes
  for (const path of [
    '/api/security/saml/callback',
    ...(buildFlavor !== 'serverless' ? ['/api/security/v1/saml'] : []),
  ]) {
    const isDeprecated = path === '/api/security/v1/saml';
    router.post(
      {
        path,
        security: {
          authz: {
            enabled: false,
            reason: 'This route must remain accessible to 3rd-party SAML providers',
          },
        },
        validate: {
          body: schema.object(
            { SAMLResponse: schema.string(), RelayState: schema.maybe(schema.string()) },
            { unknowns: 'ignore' }
          ),
        },
        options: {
          access: 'public',
          excludeFromOAS: true,
          authRequired: false,
          xsrfRequired: false,
          tags: [ROUTE_TAG_CAN_REDIRECT, ROUTE_TAG_AUTH_FLOW],
          ...(isDeprecated && {
            deprecated: {
              documentationUrl: docLinks.links.security.deprecatedV1Endpoints,
              severity: 'warning',
              message: i18n.translate('xpack.security.deprecations.samlPostRouteMessage', {
                defaultMessage:
                  'The "{path}" URL is deprecated and will be removed in the next major version. Use "/api/security/saml/callback" instead.',
                values: { path },
              }),
              reason: {
                type: 'migrate',
                newApiMethod: 'POST',
                newApiPath: '/api/security/saml/callback',
              },
            },
          }),
        },
      },
      async (context, request, response) => {
        if (isDeprecated) {
          const serverBasePath = basePath.serverBasePath;
          logger.warn(
            // When authenticating using SAML we _expect_ to redirect to the SAML Identity provider.
            `The "${serverBasePath}${path}" URL is deprecated and might stop working in a future release. Use "${serverBasePath}/api/security/saml/callback" URL instead.`
          );
        }

        // When authenticating using SAML we _expect_ to redirect to the Kibana target location.
        const authenticationResult = await getAuthenticationService().login(request, {
          provider: { type: SAMLAuthenticationProvider.type },
          value: {
            type: SAMLLogin.LoginWithSAMLResponse,
            samlResponse: request.body.SAMLResponse,
            relayState: request.body.RelayState,
          },
        });

        if (authenticationResult.redirected()) {
          return response.redirected({
            headers: { location: authenticationResult.redirectURL! },
          });
        }

        return response.unauthorized({ body: authenticationResult.error });
      }
    );
  }
}
