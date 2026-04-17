/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function isElasticCloudEsUrl(esUrl: string): boolean {
  try {
    const withProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(esUrl) ? esUrl : `https://${esUrl}`;
    const hostname = new URL(withProtocol).hostname.replace(/\.$/, '').toLowerCase();
    return (
      hostname === 'elastic-cloud.com' ||
      hostname.endsWith('.elastic-cloud.com') ||
      hostname === 'elastic.cloud' ||
      hostname.endsWith('.elastic.cloud')
    );
  } catch {
    return false;
  }
}
