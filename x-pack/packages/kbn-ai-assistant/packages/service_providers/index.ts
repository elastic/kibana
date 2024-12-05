/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  bedrock,
  gemini,
  openai,
  getBase64Logo as _getBase64Logo,
  getReactComponentLogo as _getReactComponentLogo,
  getUrlLogo as _getUrlLogo,
} from '@kbn/ai-service-providers';

export { bedrock, gemini, openai } from '@kbn/ai-service-providers';

// In AI Assistant, the names are different, shorter.  For now, we're just
// adapting the names here.

/**
 * A static map of all AI Service Providers available for use in the AI Assistant.
 */
export const SERVICE_PROVIDERS = {
  bedrock: {
    ...bedrock,
    name: 'Bedrock',
  },
  gemini: {
    ...gemini,
    name: 'Gemini',
  },
  openai,
} as const;

/** The ID of an AI Service Provider. */
export type ServiceProviderID = keyof typeof SERVICE_PROVIDERS;
const SERVICE_PROVIDER_IDS = Object.keys(SERVICE_PROVIDERS) as ServiceProviderID[];

/**
 * Returns true if the given string is a supported connector type, false otherwise.
 * @param id The connector type ID to check.
 */
export const isSupportedConnectorId = (id: string): id is ServiceProviderID => {
  return id in SERVICE_PROVIDERS;
};

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
 * @param id The ID of the Service Provider to get.
 */
export const getServiceProvider = (id: ServiceProviderID) => SERVICE_PROVIDERS[id];

/**
 * Get a lazy-loaded React component, wrapped in a `Suspense` boundary, for the logo of a service provider.
 * @param id The ID of the service provider.
 */
export const getReactComponentLogo = (id: ServiceProviderID) => _getReactComponentLogo(id);

/**
 * Get the base64-encoded SVG of the logo of a service provider.
 * @param id The ID of the service provider.
 */
export const getBase64Logo = async (id: ServiceProviderID) => _getBase64Logo(id);

/**
 * Get the URL of the logo of a service provider.
 * @param id The ID of the service provider.
 */
export const getUrlLogo = async (id: ServiceProviderID) => _getUrlLogo(id);
