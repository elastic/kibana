/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type { CheckResponseActionAuthzParams } from '../types';

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
export const checkOsqueryResponseActionAuthz = async (
  coreStart: CoreStart,
  request: KibanaRequest,
  actionParams: CheckResponseActionAuthzParams
): Promise<boolean> => {
  const {
    osquery: { writeLiveQueries, runSavedQueries },
  } = await coreStart.capabilities.resolveCapabilities(request, {
    capabilityPath: 'osquery.*',
  });

  return !!(
    writeLiveQueries ||
    (runSavedQueries && (actionParams.saved_query_id || actionParams.pack_id))
  );
};
