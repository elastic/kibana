/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type IKibanaResponse,
  type IRouter,
  type KibanaRequest,
  type KibanaResponseFactory,
  type Logger,
  type RequestHandler,
  type RouteMethod,
} from '@kbn/core/server';
import type { VersionedRouteConfig } from '@kbn/core-http-server';

import { PUBLIC_API_ACCESS } from '../../../common/constants';
import type { FleetRequestHandlerContext } from '../..';
import { getRequestStore } from '../request_store';
import { defaultFleetErrorHandler } from '../../errors';

import type { FleetVersionedRouteConfig } from './types';

import type {
  FleetAuthzRouteConfig,
  FleetAuthzRouter,
  FleetAddVersionOpts,
  FleetHandler,
} from './types';
import {
  checkSecurityEnabled,
  getAuthzFromRequest,
  doesNotHaveRequiredFleetAuthz,
} from './security';

function withDefaultPublicAccess<Method extends RouteMethod>(
  options: FleetVersionedRouteConfig<Method>
): VersionedRouteConfig<Method> {
  if (options?.access) {
    return options as VersionedRouteConfig<Method>;
  } else {
    return {
      ...options,
      access: PUBLIC_API_ACCESS,
    };
  }
}

export function withDefaultErrorHandler<
  TContext extends FleetRequestHandlerContext,
  R extends RouteMethod
>(
  wrappedHandler: RequestHandler<any, any, any, TContext, R, KibanaResponseFactory>
): RequestHandler<any, any, any, TContext, R, KibanaResponseFactory> {
  return async function defaultErrorHandlerWrapper(context, request, response) {
    try {
      return await wrappedHandler(context, request, response);
    } catch (error: any) {
      return defaultFleetErrorHandler({
        error,
        response,
        context,
        request,
      });
    }
  };
}

export function makeRouterWithFleetAuthz<TContext extends FleetRequestHandlerContext>(
  router: IRouter<TContext>,
  logger: Logger
): FleetAuthzRouter<TContext> {
  const routerAuthzWrapper = async <R extends RouteMethod>({
    context,
    request,
    response,
    handler,
    hasRequiredAuthz,
  }: {
    context: TContext;
    request: KibanaRequest;
    response: KibanaResponseFactory;
    handler: RequestHandler<any, any, any, TContext, R, KibanaResponseFactory>;
    hasRequiredAuthz?: FleetAuthzRouteConfig['fleetAuthz'];
  }): Promise<IKibanaResponse<any>> => {
    if (!checkSecurityEnabled()) {
      const securityEnabledInfo = 'Kibana security must be enabled to use Fleet';
      logger.info(securityEnabledInfo);
      return response.forbidden({
        body: {
          message: securityEnabledInfo,
        },
      });
    }

    const requestedAuthz = await getAuthzFromRequest(request);

    if (doesNotHaveRequiredFleetAuthz(requestedAuthz, hasRequiredAuthz)) {
      logger.info(`User does not have required fleet authz to access path: ${request.route.path}`);
      return response.forbidden();
    }

    return handler(context, request, response);
  };

  const requestContextWrapper = async <R extends RouteMethod>({
    context,
    request,
    response,
    handler,
  }: {
    context: TContext;
    request: KibanaRequest;
    response: KibanaResponseFactory;
    handler: RequestHandler<any, any, any, TContext, R, KibanaResponseFactory>;
  }): Promise<IKibanaResponse<any>> => {
    return getRequestStore().run(request, () => handler(context, request, response));
  };

  const fleetHandlerWrapper = async <R extends RouteMethod>({
    context,
    request,
    response,
    handler,
    hasRequiredAuthz,
  }: {
    context: TContext;
    request: KibanaRequest;
    response: KibanaResponseFactory;
    handler: RequestHandler<any, any, any, TContext, R, KibanaResponseFactory>;
    hasRequiredAuthz?: FleetAuthzRouteConfig['fleetAuthz'];
  }): Promise<IKibanaResponse<any>> => {
    return requestContextWrapper({
      context,
      request,
      response,
      handler: withDefaultErrorHandler((handlerContext, handlerRequest, handlerResponse) =>
        routerAuthzWrapper({
          context: handlerContext,
          request: handlerRequest,
          response: handlerResponse,
          handler,
          hasRequiredAuthz,
        })
      ),
    });
  };

  const fleetAuthzRouter: FleetAuthzRouter<TContext> = {
    versioned: {
      get: ({ fleetAuthz, ...options }) => {
        const res = router.versioned.get(withDefaultPublicAccess(options));
        const originalAddVersion = res.addVersion.bind(res);

        function addVersion<P, Q, B>(
          { fleetAuthz: versionAuthz, ...opts }: FleetAddVersionOpts<P, Q, B>,
          handler: FleetHandler<P, Q, B, TContext>
        ) {
          originalAddVersion({ ...opts }, (context, request, response) =>
            fleetHandlerWrapper({
              context,
              request,
              response,
              handler,
              hasRequiredAuthz: versionAuthz || fleetAuthz,
            })
          );
          return { addVersion };
        }
        return { addVersion };
      },
      delete: ({ fleetAuthz, ...options }) => {
        const res = router.versioned.delete(withDefaultPublicAccess(options));
        const originalAddVersion = res.addVersion.bind(res);

        function addVersion<P, Q, B>(
          { fleetAuthz: versionAuthz, ...opts }: FleetAddVersionOpts<P, Q, B>,
          handler: FleetHandler<P, Q, B, TContext>
        ) {
          originalAddVersion({ ...opts }, (context, request, response) =>
            fleetHandlerWrapper({
              context,
              request,
              response,
              handler,
              hasRequiredAuthz: versionAuthz || fleetAuthz,
            })
          );
          return { addVersion };
        }
        return { addVersion };
      },
      put: ({ fleetAuthz, ...options }) => {
        const res = router.versioned.put(withDefaultPublicAccess(options));
        const originalAddVersion = res.addVersion.bind(res);

        function addVersion<P, Q, B>(
          { fleetAuthz: versionAuthz, ...opts }: FleetAddVersionOpts<P, Q, B>,
          handler: FleetHandler<P, Q, B, TContext>
        ) {
          originalAddVersion({ ...opts }, (context, request, response) =>
            fleetHandlerWrapper({
              context,
              request,
              response,
              handler,
              hasRequiredAuthz: versionAuthz || fleetAuthz,
            })
          );
          return { addVersion };
        }
        return { addVersion };
      },
      post: ({ fleetAuthz, ...options }) => {
        const res = router.versioned.post(withDefaultPublicAccess(options));
        const originalAddVersion = res.addVersion.bind(res);

        function addVersion<P, Q, B>(
          { fleetAuthz: versionAuthz, ...opts }: FleetAddVersionOpts<P, Q, B>,
          handler: FleetHandler<P, Q, B, TContext>
        ) {
          originalAddVersion({ ...opts }, (context, request, response) =>
            fleetHandlerWrapper({
              context,
              request,
              response,
              handler,
              hasRequiredAuthz: versionAuthz || fleetAuthz,
            })
          );
          return { addVersion };
        }
        return { addVersion };
      },
      patch: ({ fleetAuthz, ...options }) => {
        const res = router.versioned.patch(withDefaultPublicAccess(options));
        const originalAddVersion = res.addVersion.bind(res);

        function addVersion<P, Q, B>(
          { fleetAuthz: versionAuthz, ...opts }: FleetAddVersionOpts<P, Q, B>,
          handler: FleetHandler<P, Q, B, TContext>
        ) {
          originalAddVersion({ ...opts }, (context, request, response) =>
            fleetHandlerWrapper({
              context,
              request,
              response,
              handler,
              hasRequiredAuthz: versionAuthz || fleetAuthz,
            })
          );
          return { addVersion };
        }
        return { addVersion };
      },
    },
  };

  return fleetAuthzRouter;
}
