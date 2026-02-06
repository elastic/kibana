/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { omit } from 'lodash';
import type { Url } from 'url';
import { format, parse } from 'url';

async function discoverAuth(parsedTarget: Url, log: ToolingLog) {
  const possibleCredentials = [`admin:changeme`, `elastic:changeme`];
  for (const auth of possibleCredentials) {
    const url = format({
      ...parsedTarget,
      auth,
    });
    let status: number;
    try {
      log.debug(`Fetching ${url}`);
      const response = await fetch(url);
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

async function getKibanaUrl({ kibana, log }: { kibana: string; log: ToolingLog }) {
  try {
    const isCI = process.env.CI?.toLowerCase() === 'true';

    const parsedKibanaUrl = parse(kibana);

    const kibanaUrlWithoutAuth = format(omit(parsedKibanaUrl, 'auth'));

    log.debug(`Checking Kibana URL ${kibanaUrlWithoutAuth} for a redirect`);

    let unredirectedResponse;
    try {
      unredirectedResponse = await fetch(kibanaUrlWithoutAuth, {
        headers: {
          ...(parsedKibanaUrl.auth
            ? { Authorization: `Basic ${Buffer.from(parsedKibanaUrl.auth).toString('base64')}` }
            : {}),
        },
        method: 'HEAD',
        redirect: 'manual',
      });
    } catch (fetchError: any) {
      throw fetchError;
    }

    log.debug('Unredirected response', unredirectedResponse.headers.get('location'));

    const discoveredKibanaUrl =
      unredirectedResponse.headers
        .get('location')
        ?.replace('/spaces/enter', '')
        ?.replace('spaces/space_selector', '') || kibanaUrlWithoutAuth;

    log.debug(`Discovered Kibana URL at ${discoveredKibanaUrl}`);

    const parsedTarget = parse(kibana);

    const parsedDiscoveredUrl = parse(discoveredKibanaUrl);

    const discoveredKibanaUrlWithAuth = format({
      ...parsedDiscoveredUrl,
      auth: parsedTarget.auth,
    });

    // Strip credentials from URL for fetch (Node.js fetch doesn't support credentials in URLs)
    const discoveredKibanaUrlWithoutAuth = format({
      ...parsedDiscoveredUrl,
      auth: undefined,
    });

    let redirectedResponse;
    try {
      redirectedResponse = await fetch(discoveredKibanaUrlWithoutAuth, {
        method: 'HEAD',
        headers: {
          ...(parsedTarget.auth
            ? { Authorization: `Basic ${Buffer.from(parsedTarget.auth).toString('base64')}` }
            : {}),
        },
      });
    } catch (fetchError: any) {
      throw fetchError;
    }

    if (redirectedResponse.status !== 200) {
      throw new Error(
        `Expected HTTP 200 from ${discoveredKibanaUrlWithoutAuth}, got ${redirectedResponse.status}`
      );
    }

    log.info(
      `Discovered kibana running at: ${
        isCI ? discoveredKibanaUrlWithoutAuth : discoveredKibanaUrlWithAuth
      }`
    );

    return discoveredKibanaUrlWithAuth.replace(/\/$/, '');
  } catch (error: any) {
    const parsedKibanaUrl = parse(kibana);
    const kibanaUrlWithoutAuth = format(omit(parsedKibanaUrl, 'auth'));
    const errorCode = error?.code || error?.cause?.code;
    const isConnectionError =
      errorCode === 'ECONNREFUSED' ||
      errorCode === 'ENOTFOUND' ||
      errorCode === 'ETIMEDOUT' ||
      error?.message?.includes('fetch failed') ||
      error?.message?.includes('ECONNREFUSED');

    if (isConnectionError) {
      throw new Error(
        `Could not connect to Kibana at ${kibanaUrlWithoutAuth}. ` +
          `Please ensure Kibana is running and accessible at this URL. ` +
          `Error: ${error.message || errorCode || 'Unknown connection error'}`
      );
    }

    throw new Error(`Could not connect to Kibana at ${kibanaUrlWithoutAuth}: ${error.message}`);
  }
}

export async function getServiceUrls({
  log,
  elasticsearch,
  kibana,
}: {
  elasticsearch: string;
  kibana: string;
  log: ToolingLog;
}) {
  if (!elasticsearch) {
    // assume things are running locally
    kibana = kibana || 'http://127.0.0.1:5601';
    elasticsearch = 'http://127.0.0.1:9200';
  }

  const parsedTarget = parse(elasticsearch);

  let auth = parsedTarget.auth;

  if (!parsedTarget.auth) {
    auth = await discoverAuth(parsedTarget, log);
  }

  const formattedEsUrl = format({
    ...parsedTarget,
    auth,
  });

  const suspectedKibanaUrl = kibana || elasticsearch.replace('.es', '.kb');

  const parsedKibanaUrl = parse(suspectedKibanaUrl);

  const kibanaUrlWithAuth = format({
    ...parsedKibanaUrl,
    auth: parsedKibanaUrl.auth || auth,
  });

  const validatedKibanaUrl = await getKibanaUrl({ kibana: kibanaUrlWithAuth, log });

  return {
    kibanaUrl: validatedKibanaUrl,
    esUrl: formattedEsUrl,
  };
}
