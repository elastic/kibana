/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AllConnectorsResponse } from '@kbn/actions-plugin/common/routes/connector/response';

import { v4 as uuidv4 } from 'uuid';

import { API_AUTH, COMMON_API_HEADERS } from '../common';

export const bedrockId = uuidv4();
export const azureId = uuidv4();

// Replaces request - adds baseline authentication + global headers
export const request = <T = unknown>({
  headers,
  ...options
}: Partial<Cypress.RequestOptions>): Cypress.Chainable<Cypress.Response<T>> => {
  return cy.request<T>({
    auth: API_AUTH,
    headers: { ...COMMON_API_HEADERS, ...headers },
    ...options,
  });
};
export const INTERNAL_INFERENCE_CONNECTORS = ['Elastic-Inference-Rainbow-Sprinkles'];
export const INTERNAL_CLOUD_CONNECTORS = ['Elastic-Cloud-SMTP'];

export const getConnectors = () =>
  request<AllConnectorsResponse[]>({
    method: 'GET',
    url: 'api/actions/connectors',
  });

export const createConnector = (connector: Record<string, unknown>, id: string) =>
  cy.request({
    method: 'POST',
    url: `/api/actions/connector/${id}`,
    body: connector,
    headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
  });

export const deleteConnectors = () => {
  getConnectors().then(($response) => {
    if ($response.body.length > 0) {
      const ids = $response.body.map((connector) => {
        return connector.id;
      });
      ids.forEach((id) => {
        if (
          !INTERNAL_CLOUD_CONNECTORS.includes(id) &&
          !INTERNAL_INFERENCE_CONNECTORS.includes(id)
        ) {
          request({
            method: 'DELETE',
            url: `api/actions/connector/${id}`,
          });
        }
      });
    }
  });
};

export const azureConnectorAPIPayload = {
  connector_type_id: '.gen-ai',
  secrets: {
    apiKey: '123',
  },
  config: {
    apiUrl:
      'https://goodurl.com/openai/deployments/good-gpt4o/chat/completions?api-version=2024-02-15-preview',
    apiProvider: 'Azure OpenAI',
  },
  name: 'Azure OpenAI cypress test e2e connector',
};

export const bedrockConnectorAPIPayload = {
  connector_type_id: '.bedrock',
  secrets: {
    accessKey: '123',
    secret: '123',
  },
  config: {
    apiUrl: 'https://bedrock.com',
  },
  name: 'Bedrock cypress test e2e connector',
};

export const createAzureConnector = () => createConnector(azureConnectorAPIPayload, azureId);
export const createBedrockConnector = () => createConnector(bedrockConnectorAPIPayload, bedrockId);
