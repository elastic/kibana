/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Saved object type name for Cloud Connect API key storage
 */
export const CLOUD_CONNECT_API_KEY_TYPE = 'cloud-connect-api-key';

/**
 * Use a constant UUID for the single API key stored per instance
 * This UUID is fixed to ensure we always retrieve the same saved object
 */
export const CLOUD_CONNECT_API_KEY_ID = '239feff0-7e11-4413-b800-f1f1621e9c69';

/**
 * Base URL for the Cloud API
 */
export const CLOUD_API_BASE_URL = 'https://console.qa.cld.elstc.co/api/v1';

/**
 * Cloud deployments dashboard URL
 */
export const CLOUD_DEPLOYMENTS_URL = 'https://cloud.elastic.co/deployments';

/**
 * Service configuration mapping
 */
export const SERVICE_CONFIG = {
  auto_ops: {
    key: 'auto_ops',
    titleId: 'xpack.cloudConnect.services.autoOps.title',
    titleDefault: 'AutoOps',
    descriptionId: 'xpack.cloudConnect.services.autoOps.description',
    descriptionDefault:
      'Get instant cluster diagnostics, performance tips, and cost-saving recommendations—no extra management needed.',
    docsUrl: 'https://elastic.co/docs/test',
    enableServiceByUrl: 'https://cloud.elastic.co/enable_auto_ops',
  },
  eis: {
    key: 'eis',
    titleId: 'xpack.cloudConnect.services.eis.title',
    titleDefault: 'Elastic Inference Service',
    descriptionId: 'xpack.cloudConnect.services.eis.description',
    descriptionDefault:
      'Tap into AI-powered search and chat—no ML model deployment or management needed.',
    docsUrl: 'https://elastic.co/docs/test',
    enableServiceByUrl: undefined,
  },
  synthetics: {
    key: 'synthetics',
    titleId: 'xpack.cloudConnect.services.synthetics.title',
    titleDefault: 'Synthetic',
    descriptionId: 'xpack.cloudConnect.services.synthetics.description',
    descriptionDefault:
      'Proactive, automated monitoring for apps and APIs—catch issues early, get deep diagnostics, and integrate easily.',
    docsUrl: 'https://elastic.co/docs/test',
    enableServiceByUrl: undefined,
  },
} as const;
