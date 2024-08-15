/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import { format, parse } from 'url';
import { KIBANA_DEFAULT_URL, USERNAME, PASSWORD } from './constants';

let kibanaUrl: string;

export async function getKibanaUrl() {
  if (kibanaUrl) {
    return kibanaUrl;
  }

  const kibanaURL = new URL(KIBANA_DEFAULT_URL)
  kibanaURL.username = USERNAME
  kibanaURL.password = PASSWORD

  try {
    const unredirectedResponse = await fetch(kibanaURL, {
      method: 'HEAD',
      follow: 1,
      redirect: 'manual',
    });

    const discoveredKibanaUrl =
      unredirectedResponse.headers
        .get('location')
        ?.replace('/spaces/enter', '')
        ?.replace('spaces/space_selector', '') || kibanaURL.toString();

    const parsedTarget = parse(kibanaURL.toString());

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
