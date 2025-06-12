/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { omit } from 'lodash';
import fetch from 'node-fetch';
import { format, parse, Url } from 'url';
import { getInternalKibanaHeaders } from './get_internal_kibana_headers';

async function discoverAuth(parsedTarget: Url, log: ToolingLog) {
  const possibleCredentials = [`elastic:changeme`, `admin:changeme`];
  for (const auth of possibleCredentials) {
    const url = format({
      ...parsedTarget,
      auth,
    });
    let status: number;
    try {
      log.debug(`Fetching ${url}`);
      const response = await fetch(url, {
        headers: getInternalKibanaHeaders(),
      });
      status = response.status;
    } catch (err) {
      log.debug(`${url} resulted in ${err.message}`);
      status = 0;
    }

    if (status === 200) {
      return auth;
    }
  }

  throw new Error(`Failed to authenticate user for ${format(parsedTarget)}`);
}

async function getKibanaApiUrl({ baseUrl, log }: { baseUrl: string; log: ToolingLog }) {
  try {
    const isCI = process.env.CI?.toLowerCase() === 'true';

    const parsedKibanaUrl = parse(baseUrl);

    const kibanaUrlWithoutAuth = format(omit(parsedKibanaUrl, 'auth'));

    log.debug(`Checking Kibana URL ${kibanaUrlWithoutAuth} for a redirect`);

    const headers = {
      ...getInternalKibanaHeaders(),
      ...(parsedKibanaUrl.auth
        ? { Authorization: `Basic ${Buffer.from(parsedKibanaUrl.auth).toString('base64')}` }
        : {}),
    };

    const unredirectedResponse = await fetch(kibanaUrlWithoutAuth, {
      headers,
      method: 'HEAD',
      follow: 1,
      redirect: 'manual',
    });

    log.debug('Unredirected response', unredirectedResponse.headers.get('location'));

    const discoveredKibanaUrl =
      unredirectedResponse.headers
        .get('location')
        ?.replace('/spaces/enter', '')
        ?.replace('spaces/space_selector', '') || kibanaUrlWithoutAuth;

    log.debug(`Discovered Kibana URL at ${discoveredKibanaUrl}`);

    const parsedTarget = parse(baseUrl);

    const parsedDiscoveredUrl = parse(discoveredKibanaUrl);

    const discoveredKibanaUrlWithAuth = format({
      ...parsedDiscoveredUrl,
      auth: parsedTarget.auth,
    });

    const redirectedResponse = await fetch(discoveredKibanaUrlWithAuth, {
      method: 'HEAD',
      headers,
    });

    if (redirectedResponse.status !== 200) {
      throw new Error(
        `Expected HTTP 200 from ${discoveredKibanaUrlWithAuth}, got ${redirectedResponse.status}`
      );
    }

    const discoveredKibanaUrlWithoutAuth = format({
      ...parsedDiscoveredUrl,
      auth: undefined,
    });

    log.info(
      `Discovered kibana running at: ${
        isCI ? discoveredKibanaUrlWithoutAuth : discoveredKibanaUrlWithAuth
      }`
    );

    return discoveredKibanaUrlWithAuth.replace(/\/$/, '');
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

  const parsedTarget = parse(baseUrl);

  let authToUse = auth?.basic ? `${auth.basic.username}:${auth.basic.password}` : parsedTarget.auth;

  if (!authToUse) {
    authToUse = await discoverAuth(parsedTarget, log);
  }

  const suspectedKibanaUrl = baseUrl;

  const parsedKibanaUrl = parse(suspectedKibanaUrl);

  const kibanaUrlWithAuth = format({
    ...parsedKibanaUrl,
    auth: authToUse,
  });

  const validatedKibanaUrl = await getKibanaApiUrl({ baseUrl: kibanaUrlWithAuth, log });

  return validatedKibanaUrl;
}
