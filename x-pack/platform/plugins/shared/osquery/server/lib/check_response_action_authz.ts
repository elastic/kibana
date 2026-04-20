/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, KibanaRequest } from '@kbn/core/server';
import type { CheckResponseActionAuthzParams } from '../types';
import { CustomHttpRequestError } from '../common/error';

interface OsqueryCapabilities {
  writeLiveQueries: boolean;
  runSavedQueries: boolean;
}

// Cache capability resolution per request so bulk operations (e.g., duplicating
// hundreds of rules) only call resolveCapabilities once per request.
const capabilitiesCache = new WeakMap<KibanaRequest, Promise<OsqueryCapabilities>>();

const resolveOsqueryCapabilities = (
  coreStart: CoreStart,
  request: KibanaRequest
): Promise<OsqueryCapabilities> => {
  let promise = capabilitiesCache.get(request);

  if (!promise) {
    promise = (async () => {
      const resolved = await coreStart.capabilities.resolveCapabilities(request, {
        capabilityPath: 'osquery.*',
      });

      return {
        writeLiveQueries: !!resolved.osquery.writeLiveQueries,
        runSavedQueries: !!resolved.osquery.runSavedQueries,
      };
    })();
    capabilitiesCache.set(request, promise);
  }

  return promise;
};

/**
 * Checks whether the requesting user has the required osquery privileges
 * for a given action configuration.
 *
 * Privilege logic (mirrors create_live_query_route):
 * - Direct query → needs writeLiveQueries
 * - Saved query / pack → needs writeLiveQueries OR runSavedQueries
 *
 * @returns true if authorized, false otherwise
 */
export const isOsqueryResponseActionAuthorized = async (
  coreStart: CoreStart,
  request: KibanaRequest,
  actionParams: CheckResponseActionAuthzParams
): Promise<boolean> => {
  const { writeLiveQueries, runSavedQueries } = await resolveOsqueryCapabilities(
    coreStart,
    request
  );

  return !!(
    writeLiveQueries ||
    (runSavedQueries && (actionParams.saved_query_id || actionParams.pack_id))
  );
};

/**
 * Validates that the requesting user has the required osquery privileges
 * for the given response action configuration.
 * Throws a 403 CustomHttpRequestError if the user lacks authorization.
 *
 * Used by security_solution when creating/updating detection rules
 * that include osquery response actions.
 */
export const checkResponseActionAuthz = async (
  core: CoreSetup,
  request: KibanaRequest,
  actionParams: CheckResponseActionAuthzParams
): Promise<void> => {
  const [coreStart] = await core.getStartServices();
  const isAuthorized = await isOsqueryResponseActionAuthorized(coreStart, request, actionParams);

  if (!isAuthorized) {
    throw new CustomHttpRequestError(
      'User is not authorized to create/update osquery response action',
      403
    );
  }
};
