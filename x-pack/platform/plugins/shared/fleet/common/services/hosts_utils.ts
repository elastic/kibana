/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

function getPortForURL(url: URL) {
  if (url.port !== '') {
    return url.port;
  }

  if (url.protocol === 'http:') {
    return '80';
  }

  if (url.protocol === 'https:') {
    return '443';
  }
}

export function normalizeHostsForAgents(host: string) {
  // Elastic Agent is not using default port for http|https for Fleet server and ES https://github.com/elastic/beats/issues/25420
  const hostURL = new URL(host);

  // We are building the URL manualy as url format will not include the port if the port is 80 or 443
  return `${hostURL.protocol}//${hostURL.hostname}:${getPortForURL(hostURL)}${
    hostURL.pathname === '/' ? '' : hostURL.pathname
  }`;
}
