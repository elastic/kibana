/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '..';
import type { ConfigType } from '../../config';
import { createLicensedRouteHandler } from '../licensed_route_handler';

/**
 * Defines routes required for the Access Agreement view.
 */
export function defineAccessAgreementRoutes({
  getSession,
  httpResources,
  license,
  config,
  router,
  logger,
}: RouteDefinitionParams) {
  // If license doesn't allow access agreement we shouldn't handle request.
  const canHandleRequest = () => license.getFeatures().allowAccessAgreement;

  httpResources.register(
    {
      path: '/security/access_agreement',
      validate: false,
      options: { excludeFromOAS: true },
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization because it requires only proper license in order to function',
        },
      },
    },
    createLicensedRouteHandler(async (context, request, response) =>
      canHandleRequest()
        ? response.renderCoreApp()
        : response.forbidden({
            body: { message: `Current license doesn't support access agreement.` },
          })
    )
  );

  router.get(
    {
      path: '/internal/security/access_agreement/state',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization because it requires only an active session in order to function',
        },
      },
      validate: false,
    },
    createLicensedRouteHandler(async (context, request, response) => {
      if (!canHandleRequest()) {
        return response.forbidden({
          body: { message: `Current license doesn't support access agreement.` },
        });
      }

      // It's not guaranteed that we'll have session for the authenticated user (e.g. when user is
      // authenticated with the help of HTTP authentication), that means we should safely check if
      // we have it and can get a corresponding configuration.
      const { value: sessionValue } = await getSession().get(request);

      let accessAgreement = '';

      if (sessionValue) {
        const providerSpecificAccessAgreement =
          config.authc.providers[
            sessionValue.provider.type as keyof ConfigType['authc']['providers']
          ]?.[sessionValue.provider.name]?.accessAgreement?.message;

        const globalAccessAgreement = config.accessAgreement?.message;

        if (providerSpecificAccessAgreement) {
          accessAgreement = providerSpecificAccessAgreement;
        } else if (globalAccessAgreement) {
          accessAgreement = globalAccessAgreement;
        }
      }

      return response.ok({ body: { accessAgreement } });
    })
  );
}
