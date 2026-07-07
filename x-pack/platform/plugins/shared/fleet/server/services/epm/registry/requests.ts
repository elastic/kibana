/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch, { FetchError } from 'node-fetch';
import type { RequestInit, Response } from 'node-fetch';
import pRetry from 'p-retry';

import { streamToString } from '../streams';
import { appContextService } from '../../app_context';
import { RegistryError, RegistryConnectionError, RegistryResponseError } from '../../../errors';

import { airGappedUtils } from '../airgapped';

import { getProxyAgent, getRegistryProxyUrl } from './proxy';
import type { Agent as HttpAgent } from 'http';
import type { Agent as HttpsAgent } from 'https';

type FailedAttemptErrors = pRetry.FailedAttemptError | FetchError | Error;

// not sure what to call this function, but we're not exporting it
async function registryFetch(url: string) {
  const response = await fetch(url, getFetchOptions(url));

  if (response.ok) {
    return response;
  } else {
    // 4xx & 5xx responses
    const { status, statusText, url: resUrl } = response;
    const message = `'${status} ${statusText}' error response from package registry at ${
      resUrl || url
    }`;
    const responseError = new RegistryResponseError(message, status);

    // retry 5xx errors
    if (status >= 500) {
      throw responseError;
    }
    throw new pRetry.AbortError(responseError);
  }
}

export async function getResponse(url: string, retries: number = 5): Promise<Response | null> {
  const logger = appContextService.getLogger();

  if (airGappedUtils().shouldSkipRegistryRequests) {
    logger.debug(
      'getResponse: isAirGapped enabled and no registryUrl or RegistryProxyUrl configured, skipping registry requests'
    );
    return null;
  }

  try {
    // we only want to retry certain failures like network issues
    // the rest should only try the one time then fail as they do now
    const response = await pRetry(() => registryFetch(url), {
      factor: 2,
      retries,
      onFailedAttempt: (error) => {
        // we only want to retry certain types of errors, like `ECONNREFUSED` and other operational errors
        // and let the others through without retrying
        //
        // throwing in onFailedAttempt will abandon all retries & fail the request
        // we only want to retry system errors, so re-throw for everything else
        if (!isSystemError(error) && !isRegistry5xxError(error)) {
          throw error;
        }
      },
    });
    return response;
  } catch (error) {
    // isSystemError here means we didn't succeed after max retries
    if (isSystemError(error)) {
      throw new RegistryConnectionError(`Error connecting to package registry: ${error.message}`);
    }
    // don't wrap our own errors
    if (error instanceof RegistryError) {
      throw error;
    } else {
      throw new RegistryError(error);
    }
  }
}

export async function getResponseStream(
  url: string,
  retries?: number
): Promise<NodeJS.ReadableStream> {
  const logger = appContextService.getLogger();
  const res = await getResponse(url, retries);
  try {
    if (res) {
      return res?.body;
    }
    throw new RegistryResponseError('getResponseStream - Error connecting to the registry');
  } catch (error) {
    logger.error(`getResponseStream error: ${error}`);
    throw error;
  }
}

export async function getResponseStreamWithSize(
  url: string,
  retries?: number
): Promise<{ stream: NodeJS.ReadableStream; size?: number }> {
  const logger = appContextService.getLogger();
  try {
    const res = await getResponse(url, retries);
    if (res) {
      const contentLengthHeader = res.headers.get('Content-Length');
      const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : undefined;

      return {
        stream: res.body,
        size: contentLength && !isNaN(contentLength) ? contentLength : undefined,
      };
    }
    throw new RegistryResponseError('getResponseStreamWithSize - Error connecting to the registry');
  } catch (error) {
    logger.error(`getResponseStream error: ${error}`);
    throw error;
  }
}

export async function fetchUrl(url: string, retries?: number): Promise<string> {
  const logger = appContextService.getLogger();
  try {
    return getResponseStream(url, retries).then(streamToString);
  } catch (error) {
    logger.warn(`fetchUrl - failed with error: ${error}`);
    throw error;
  }
}

// node-fetch throws a FetchError for those types of errors and
// "All errors originating from Node.js core are marked with error.type = 'system'"
// https://github.com/node-fetch/node-fetch/blob/master/docs/ERROR-HANDLING.md#error-handling-with-node-fetch
function isFetchError(error: FailedAttemptErrors): error is FetchError {
  return error instanceof FetchError || error.name === 'FetchError';
}

function isSystemError(error: FailedAttemptErrors): boolean {
  return isFetchError(error) && error.type === 'system';
}

function isRegistry5xxError(error: FailedAttemptErrors): boolean {
  return (
    (error instanceof RegistryResponseError || error.name === 'RegistryResponseError') &&
    ((error as RegistryResponseError)?.status ?? 0) >= 500
  );
}

export function getFetchOptions(targetUrl: string): RequestInit | undefined {
  const options: RequestInit = {
    headers: {
      'User-Agent': `Kibana/${appContextService.getKibanaVersion()} node-fetch`,
    },
  };
  const proxyUrl = getRegistryProxyUrl();
  if (!proxyUrl) {
    return options;
  }

  const logger = appContextService.getLogger();
  logger.debug(`Using ${proxyUrl} as proxy for ${targetUrl}`);

  options.agent = getProxyAgent({ proxyUrl, targetUrl }) as unknown as HttpAgent | HttpsAgent;
  return options;
}
