/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Known Elastic Cloud Hosted (ECH) Fleet Server domains.
// Note: newer ECH regions provisioned on elastic.cloud are not distinguishable from Serverless
// by domain alone and will be classified as 'unknown'.
const ECH_FLEET_DOMAINS = [
  'found.io', // AWS ECH production
  'cloud.es.io', // GCP ECH production
  'elastic-cloud.com', // Azure ECH production
  'cld.elstc.co', // ECH staging/QA
  'foundit.no', // ECH legacy staging
];

// Known Serverless Fleet Server domains.
const SERVERLESS_FLEET_DOMAINS = ['elastic.cloud'];

export function detectTargetClusterType(uri: string): 'serverless' | 'ech' | undefined {
  try {
    const { hostname } = new URL(uri);
    if (SERVERLESS_FLEET_DOMAINS.some((domain) => hostname.endsWith(`.${domain}`))) {
      return 'serverless';
    }
    if (ECH_FLEET_DOMAINS.some((domain) => hostname.endsWith(`.${domain}`))) {
      return 'ech';
    }
  } catch {
    // invalid URL
  }
  return undefined;
}
