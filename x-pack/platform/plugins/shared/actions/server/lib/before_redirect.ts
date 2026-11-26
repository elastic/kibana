/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosRequestConfig } from 'axios';
import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../actions_config';
import { isSameOriginRedirect, removeCrossOriginUnsafeHeaders } from './redirect_headers';

interface RedirectOptions {
  hostname?: unknown;
  href?: unknown;
  headers?: Record<string, unknown>;
}

interface RedirectRequestDetails {
  url?: string;
}

/**
 * Returns the follow-redirects hook used by connector HTTP requests: it rejects redirects to hosts
 * outside xpack.actions.allowedHosts and drops all but a few safe headers on cross-origin redirects.
 */
export const getBeforeRedirectFn = (
  configurationUtilities: ActionsConfigurationUtilities,
  logger: Logger
): NonNullable<AxiosRequestConfig['beforeRedirect']> => {
  return (
    options: RedirectOptions,
    _responseDetails?: unknown,
    requestDetails?: RedirectRequestDetails
  ) => {
    const { hostname, href, headers } = options;
    if (hostname == null) {
      throw new Error('redirect hostname not provided by axios');
    }

    if (typeof hostname !== 'string') {
      throw new Error('redirect hostname provided by axios was not a string');
    }

    configurationUtilities.ensureHostnameAllowed(hostname);

    if (headers == null || isSameOriginRedirect(requestDetails?.url, href)) {
      return;
    }

    const removed = removeCrossOriginUnsafeHeaders(headers);
    if (removed.length > 0) {
      logger.debug(
        `Removed headers [${removed.join(
          ', '
        )}] from a connector request redirected to another origin (${hostname})`
      );
    }
  };
};
