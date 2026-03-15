/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { getInternalKibanaHeaders } from './get_internal_kibana_headers';

const getAuth = (url: URL): string | undefined => {
  if (!url.username && !url.password) {
    return undefined;
  }

  return `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`;
};

const setAuth = (url: URL, auth?: string): URL => {
  const nextUrl = new URL(url.toString());

  if (!auth) {
    return nextUrl;
  }

  const separatorIndex = auth.indexOf(':');
  nextUrl.username = separatorIndex >= 0 ? auth.slice(0, separatorIndex) : auth;
  nextUrl.password = separatorIndex >= 0 ? auth.slice(separatorIndex + 1) : '';

  return nextUrl;
};

const stripAuth = (url: URL): URL => {
  const nextUrl = new URL(url.toString());
  nextUrl.username = '';
  nextUrl.password = '';
  return nextUrl;
};

const getAuthHeaders = (url: URL): Record<string, string> => {
  const auth = getAuth(url);

  if (!auth) {
    return {};
  }

  return { Authorization: `Basic ${Buffer.from(auth).toString('base64')}` };
};

async function discoverAuth(parsedTarget: URL, log: ToolingLog) {
  const possibleCredentials = [`elastic:changeme`, `admin:changeme`];
  for (const auth of possibleCredentials) {
    const url = setAuth(parsedTarget, auth);
    let status: number;
    try {
      log.debug(`Fetching ${stripAuth(url)}`);
      const response = await fetch(stripAuth(url).toString(), {
        headers: {
          ...getInternalKibanaHeaders(),
          ...getAuthHeaders(url),
        },
      });
      status = response.status;
    } catch (err) {
      log.debug(`${stripAuth(url)} resulted in ${err.message}`);
      status = 0;
    }

    if (status === 200) {
      return auth;
    }
  }

  throw new Error(`Failed to authenticate user for ${stripAuth(parsedTarget)}`);
}

async function getKibanaApiUrl({ baseUrl, log }: { baseUrl: string; log: ToolingLog }) {
  try {
    const isCI = process.env.CI?.toLowerCase() === 'true';
    const parsedKibanaUrl = new URL(baseUrl);
    const kibanaUrlWithoutAuth = stripAuth(parsedKibanaUrl);

    log.debug(`Checking Kibana URL ${kibanaUrlWithoutAuth} for a redirect`);

    const headers = {
      ...getInternalKibanaHeaders(),
      ...getAuthHeaders(parsedKibanaUrl),
    };

    const unredirectedResponse = await fetch(kibanaUrlWithoutAuth.toString(), {
      headers,
      method: 'HEAD',
      redirect: 'manual',
    });

    log.debug('Unredirected response', unredirectedResponse.headers.get('location'));

    const discoveredKibanaUrl = new URL(
      unredirectedResponse.headers
        .get('location')
        ?.replace('/spaces/enter', '')
        ?.replace('spaces/space_selector', '') || kibanaUrlWithoutAuth.toString(),
      kibanaUrlWithoutAuth
    );

    log.debug(`Discovered Kibana URL at ${discoveredKibanaUrl}`);

    const discoveredKibanaUrlWithAuth = setAuth(discoveredKibanaUrl, getAuth(parsedKibanaUrl));

    const redirectedResponse = await fetch(stripAuth(discoveredKibanaUrlWithAuth).toString(), {
      method: 'HEAD',
      headers,
    });

    if (redirectedResponse.status !== 200) {
      throw new Error(
        `Expected HTTP 200 from ${discoveredKibanaUrlWithAuth}, got ${redirectedResponse.status}`
      );
    }

    const discoveredKibanaUrlWithoutAuth = stripAuth(discoveredKibanaUrlWithAuth);

    log.info(
      `Discovered kibana running at: ${
        isCI ? discoveredKibanaUrlWithoutAuth : discoveredKibanaUrlWithAuth
      }`
    );

    return discoveredKibanaUrlWithAuth.toString().replace(/\/$/, '');
  } catch (error) {
    throw new Error(`Could not connect to Kibana: ` + error.message);
  }
}

export async function discoverKibanaUrl({
  baseUrl,
  log,
  auth,
}: {
  baseUrl?: string;
  log: ToolingLog;
  auth?: { basic: { username: string; password: string } };
}) {
  baseUrl = baseUrl ?? 'http://127.0.0.1:5601';

  const parsedTarget = new URL(baseUrl);

  let authToUse = auth?.basic
    ? `${auth.basic.username}:${auth.basic.password}`
    : getAuth(parsedTarget);

  if (!authToUse) {
    authToUse = await discoverAuth(parsedTarget, log);
  }

  const suspectedKibanaUrl = baseUrl;

  const kibanaUrlWithAuth = setAuth(new URL(suspectedKibanaUrl), authToUse).toString();

  const validatedKibanaUrl = await getKibanaApiUrl({ baseUrl: kibanaUrlWithAuth, log });

  return validatedKibanaUrl;
}
