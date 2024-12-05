/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { type ServiceProviderID, SERVICE_PROVIDER_IDS } from './id';
export { getReactComponentLogo, getBase64Logo, getUrlLogo } from './logo';
export type { ProviderSolution } from './solutions';

import { SERVICE_PROVIDER_CONNECTOR_IDS } from './connector_id';
import { type ServiceProviderID, SERVICE_PROVIDER_IDS } from './id';
import { SERVICE_PROVIDER_NAMES } from './name';
import { type ProviderSolution, SERVICE_PROVIDER_SOLUTIONS } from './solutions';

/**
 * An AI Service Provider available to used in Kibana.
 */
export interface ServiceProvider {
  /** The ID of the provider. */
  id: ServiceProviderID;
  /** A display name for the provider. */
  name: string;
  /** Solutions in which the provider can be used. */
  solutions: readonly ProviderSolution[];
  /** The connector type ID of the provider. */
  connectorId: string;
}

/**
 * A static map of all AI Service Providers available for use in Kibana.
 */
export const SERVICE_PROVIDERS = SERVICE_PROVIDER_IDS.reduce((acc, id) => {
  acc[id] = {
    id,
    name: SERVICE_PROVIDER_NAMES[id],
    solutions: SERVICE_PROVIDER_SOLUTIONS[id],
    connectorId: SERVICE_PROVIDER_CONNECTOR_IDS[id],
  };

  return acc;
}, {} as Record<ServiceProviderID, ServiceProvider>);

export const {
  /** Amazon Bedrock */
  bedrock,
  /** Google Gemini */
  gemini,
  /** Open AI */
  openai,
} = SERVICE_PROVIDERS;

/**
 * Return all Service Provider IDs.
 */
export const getServiceProviderIds = () => SERVICE_PROVIDER_IDS;

/**
 * Return all Service Providers, mapped by ID.
 */
export const getServiceProviders = () => SERVICE_PROVIDERS;

/**
 * Return a Service Provider by ID.
 * @param id The ID of the Service Provider.
 */
export const getServiceProvider = (id: ServiceProviderID) => SERVICE_PROVIDERS[id];

/**
 * Returns true if the given string is a supported connector type, false otherwise.
 * @param id The connector type ID to check.
 */
export { isSupportedConnectorId } from './connector_id';
