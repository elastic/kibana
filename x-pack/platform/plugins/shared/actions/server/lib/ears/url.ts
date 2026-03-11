/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
const SUPPORTED_EARS_PROVIDERS = new Set(['github', 'google', 'microsoft']);

export function resolveEarsUrl(urlPath: string, earsBaseUrl: string | undefined): string {
  if (!earsBaseUrl) {
    throw new Error('EARS base URL is not configured');
  }

  const base = earsBaseUrl.replace(/\/$/, ''); // strip trailing slash if any present
  const path = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;

  return `${base}${path}`;
}

export interface EarsEndpoints {
  tokenEndpoint: string;
  refreshEndpoint: string;
}

export function getEarsEndpointsForProvider(provider: string | undefined): EarsEndpoints {
  if (!provider) {
    throw new Error('Provider is not configured');
  }
  if (!SUPPORTED_EARS_PROVIDERS.has(provider)) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  return {
    tokenEndpoint: `${provider}/oauth/token`,
    refreshEndpoint: `${provider}/oauth/refresh`,
  };
}
