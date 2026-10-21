/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../app_context';

/** Whether a launched CloudFormation stack could report back to this Kibana, and why not. */
export interface ProvisioningCallbackAvailability {
  available: boolean;
  /** The URL the stack is given: `server.publicBaseUrl` without a trailing slash. */
  kibanaUrl?: string;
  /** Why the callback cannot be used, worded for the operator and the user. Set when unavailable. */
  reason?: string;
}

/**
 * Checks the configuration a launched stack needs to report back: `server.publicBaseUrl` must be
 * set and be https, since CloudFormation only accepts an https callback URL. Whether AWS can reach
 * that URL is not checked. Kibana's own view of the network says nothing about what AWS sees.
 */
export const getProvisioningCallbackAvailability = (): ProvisioningCallbackAvailability => {
  const configured = appContextService.getHttpSetup().basePath.publicBaseUrl;
  if (!configured) {
    return {
      available: false,
      reason: 'Kibana has no public URL: server.publicBaseUrl is not set.',
    };
  }
  const kibanaUrl = configured.replace(/\/+$/, '');
  if (!/^https:\/\//.test(kibanaUrl)) {
    return {
      available: false,
      kibanaUrl,
      reason: `The public Kibana URL ${kibanaUrl} is not https. CloudFormation only accepts an https callback URL.`,
    };
  }
  return { available: true, kibanaUrl };
};
