/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceProviderID } from './id';

// There are more service providers and connector types in @kbn/stack-connectors-plugin,
// but until we know which other logos or properties we'd like to migrate, we're only
// including those currently in use by the AI Assistant.
export const SERVICE_PROVIDER_CONNECTOR_IDS: Record<ServiceProviderID, string> = {
  bedrock: '.bedrock',
  openai: '.gen-ai',
  gemini: '.gemini',
};

/**
 * Returns true if the given string is a supported connector type, false otherwise.
 * @param id The connector type ID to check.
 */
export const isSupportedConnectorId = (id: string) =>
  Object.values(SERVICE_PROVIDER_CONNECTOR_IDS).includes(id);
