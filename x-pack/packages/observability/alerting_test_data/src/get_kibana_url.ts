/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import { format, parse } from 'url';
import { KIBANA_DEFAULT_URL } from './constants';

let kibanaUrl: string;

export async function getKibanaUrl() {
  if (kibanaUrl) {
    return kibanaUrl;
  }

  try {
    const unredirectedResponse = await fetch(KIBANA_DEFAULT_URL, {
      method: 'HEAD',
      follow: 1,
      redirect: 'manual',
    });

    const discoveredKibanaUrl =
      unredirectedResponse.headers
        .get('location')
        ?.replace('/spaces/enter', '')
        ?.replace('spaces/space_selector', '') || KIBANA_DEFAULT_URL;

    const parsedTarget = parse(KIBANA_DEFAULT_URL);

    const parsedDiscoveredUrl = parse(discoveredKibanaUrl);

    const discoveredKibanaUrlWithAuth = format({
      ...parsedDiscoveredUrl,
      auth: parsedTarget.auth,
    });

    const redirectedResponse = await fetch(discoveredKibanaUrlWithAuth, {
      method: 'HEAD',
    });

    if (redirectedResponse.status !== 200) {
      throw new Error(
        `Expected HTTP 200 from ${discoveredKibanaUrlWithAuth}, got ${redirectedResponse.status}`
      );
    }

    // eslint-disable-next-line no-console
    console.log(`Discovered kibana running at: ${discoveredKibanaUrlWithAuth}`);

    kibanaUrl = discoveredKibanaUrlWithAuth.replace(/\/$/, '');
    return kibanaUrl;
  } catch (error) {
    throw new Error(`Could not connect to Kibana: ` + error.message);
  }
}
