/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';

import {
  CreateAutoImportIntegrationRequestBody,
  CreateAutoImportIntegrationResponse,
  DeleteAutoImportIntegrationRequestParams,
  GetAutoImportIntegrationRequestParams,
  GetAutoImportIntegrationResponse,
  GetAllAutoImportIntegrationsResponse,
  UpdateAutoImportIntegrationRequestBody,
  UpdateAutoImportIntegrationRequestParams,
} from './integration.gen';

describe('integration schemas', () => {
  // Helper to create a valid data stream
  const createValidDataStream = (overrides = {}) => ({
    dataStreamId: 'ds-123',
    title: 'logs',
    description: 'Log data stream',
    inputTypes: [{ name: 'filestream' as const }],
    ...overrides,
  });

  // Helper to create a valid integration response
  const createValidIntegrationResponse = (overrides = {}) => ({
    integrationId: 'integration-123',
    title: 'Test Integration',
    description: 'Integration for testing purposes',
    status: 'pending' as const,
    dataStreams: [
      {
        dataStreamId: 'ds-123',
        title: 'logs',
        description: 'Log data stream',
        inputTypes: [{ name: 'filestream' as const }],
        status: 'pending' as const,
      },
    ],
    ...overrides,
  });

  describe('CreateAutoImportIntegrationRequestBody', () => {
    const validPayload = {
      connectorId: 'test-connector-id',
      integrationId: 'test-integration',
      title: 'Test Integration',
      description: 'Integration for testing purposes',
      logo: 'data:image/png;base64,abc123',
      dataStreams: [createValidDataStream()],
    };

    it('accepts a valid payload', () => {
      const result = CreateAutoImportIntegrationRequestBody.safeParse(validPayload);
      expectParseSuccess(result);
    });

    it('requires connectorId', () => {
      const payload = {
        integrationId: 'test-integration',
        title: 'Test Integration',
        description: 'Integration for testing purposes',
        dataStreams: [createValidDataStream()],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('connectorId: Required');
    });

    it('requires integrationId', () => {
      const payload = {
        connectorId: 'test-connector-id',
        title: 'Test Integration',
        description: 'Integration for testing purposes',
        dataStreams: [createValidDataStream()],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('integrationId: Required');
    });

    it('rejects empty integrationId', () => {
      const payload = {
        ...validPayload,
        integrationId: '   ',
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('integrationId: No empty strings allowed');
    });

    it('accepts a payload with multiple data streams', () => {
      const payload = {
        ...validPayload,
        dataStreams: [
          createValidDataStream({ title: 'logs' }),
          createValidDataStream({
            title: 'metrics',
            inputTypes: [{ name: 'http_endpoint' as const }],
          }),
        ],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseSuccess(result);
    });

    it('accepts integration without logo', () => {
      const payload = {
        connectorId: 'test-connector-id',
        integrationId: 'test-integration',
        title: 'Test Integration',
        description: 'Integration for testing purposes',
        dataStreams: [createValidDataStream()],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseSuccess(result);
    });

    it('accepts integration without dataStreams (optional)', () => {
      const payload = {
        connectorId: 'test-connector-id',
        integrationId: 'test-integration',
        title: 'Test Integration',
        description: 'Integration for testing purposes',
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseSuccess(result);
    });

    it('rejects unknown properties', () => {
      const payload = {
        ...validPayload,
        unknown: 'property',
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);
    });

    it('requires title', () => {
      const payload = {
        connectorId: 'test-connector-id',
        integrationId: 'test-integration',
        description: 'Integration for testing purposes',
        dataStreams: [createValidDataStream()],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('title: Required');
    });

    it('requires description', () => {
      const payload = {
        connectorId: 'test-connector-id',
        integrationId: 'test-integration',
        title: 'Test Integration',
        dataStreams: [createValidDataStream()],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('description: Required');
    });

    it('requires data stream title', () => {
      const payload = {
        connectorId: 'test-connector-id',
        integrationId: 'test-integration',
        title: 'Test Integration',
        description: 'Integration for testing purposes',
        dataStreams: [
          {
            dataStreamId: 'ds-123',
            description: 'Log data stream',
            inputTypes: [{ name: 'filestream' as const }],
          },
        ],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('title: Required');
    });

    it('requires data stream dataStreamId', () => {
      const payload = {
        connectorId: 'test-connector-id',
        integrationId: 'test-integration',
        title: 'Test Integration',
        description: 'Integration for testing purposes',
        dataStreams: [
          {
            title: 'logs',
            description: 'Log data stream',
            inputTypes: [{ name: 'filestream' as const }],
          },
        ],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('dataStreamId: Required');
    });

    it('rejects invalid input type', () => {
      const payload = {
        connectorId: 'test-connector-id',
        integrationId: 'test-integration',
        title: 'Test Integration',
        description: 'Integration for testing purposes',
        dataStreams: [
          {
            ...createValidDataStream(),
            inputTypes: [{ name: 'invalid-type' }],
          },
        ],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);
    });

    it('accepts all valid input types', () => {
      const inputTypes = [
        'aws-cloudwatch',
        'aws-s3',
        'azure-blob-storage',
        'azure-eventhub',
        'cloudfoundry',
        'filestream',
        'gcp-pubsub',
        'gcs',
        'http_endpoint',
        'journald',
        'kafka',
        'tcp',
        'udp',
      ];

      inputTypes.forEach((inputType) => {
        const payload = {
          connectorId: 'test-connector-id',
          integrationId: 'test-integration',
          title: 'Test Integration',
          description: 'Integration for testing purposes',
          dataStreams: [
            {
              ...createValidDataStream(),
              inputTypes: [{ name: inputType }],
            },
          ],
        };

        const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
        expectParseSuccess(result);
      });
    });

    it('rejects empty string for title', () => {
      const payload = {
        connectorId: 'test-connector-id',
        integrationId: 'test-integration',
        title: '   ',
        description: 'Integration for testing purposes',
        dataStreams: [createValidDataStream()],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('title: No empty strings allowed');
    });

    it('rejects empty string for description', () => {
      const payload = {
        connectorId: 'test-connector-id',
        integrationId: 'test-integration',
        title: 'Test Integration',
        description: '   ',
        dataStreams: [createValidDataStream()],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('description: No empty strings allowed');
    });
  });

  describe('CreateAutoImportIntegrationResponse', () => {
    it('accepts a response with integration_id', () => {
      const payload = {
        integration_id: 'integration-123',
      };

      const result = CreateAutoImportIntegrationResponse.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('accepts an empty response', () => {
      const payload = {};

      const result = CreateAutoImportIntegrationResponse.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('rejects empty integration_id', () => {
      const payload = {
        integration_id: '   ',
      };

      const result = CreateAutoImportIntegrationResponse.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('integration_id: No empty strings allowed');
    });

    it('rejects unknown properties', () => {
      const payload = {
        integration_id: 'integration-123',
        unknown: 'property',
      };

      const result = CreateAutoImportIntegrationResponse.safeParse(payload);
      expectParseError(result);
    });
  });

  describe('GetAutoImportIntegrationRequestParams', () => {
    it('requires integration_id', () => {
      const result = GetAutoImportIntegrationRequestParams.safeParse({});
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('integration_id: Required');
    });

    it('rejects empty integration_id', () => {
      const payload = {
        integration_id: '   ',
      };

      const result = GetAutoImportIntegrationRequestParams.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('integration_id: No empty strings allowed');
    });

    it('accepts valid params', () => {
      const payload = {
        integration_id: 'integration-123',
      };

      const result = GetAutoImportIntegrationRequestParams.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('strips unknown properties', () => {
      const payload = {
        integration_id: 'integration-123',
        unknown: 'property',
      };

      const result = GetAutoImportIntegrationRequestParams.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual({
        integration_id: 'integration-123',
      });
    });
  });

  describe('GetAutoImportIntegrationResponse', () => {
    it('requires integrationResponse field', () => {
      const result = GetAutoImportIntegrationResponse.safeParse({});
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('integrationResponse: Required');
    });

    it('accepts a valid response with full integration', () => {
      const payload = {
        integrationResponse: createValidIntegrationResponse(),
      };

      const result = GetAutoImportIntegrationResponse.safeParse(payload);
      expectParseSuccess(result);
    });

    it('requires integrationId in integrationResponse object', () => {
      const payload = {
        integrationResponse: {
          title: 'Test Integration',
          description: 'Integration for testing purposes',
          status: 'pending',
          dataStreams: [],
        },
      };

      const result = GetAutoImportIntegrationResponse.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('integrationId: Required');
    });

    it('requires status in integrationResponse', () => {
      const payload = {
        integrationResponse: {
          integrationId: 'integration-123',
          title: 'Test Integration',
          description: 'Integration for testing purposes',
          dataStreams: [],
        },
      };

      const result = GetAutoImportIntegrationResponse.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('status: Required');
    });

    it('rejects empty integrationId in integrationResponse', () => {
      const payload = {
        integrationResponse: {
          integrationId: '   ',
          title: 'Test Integration',
          description: 'Integration for testing purposes',
          status: 'pending' as const,
          dataStreams: [],
        },
      };

      const result = GetAutoImportIntegrationResponse.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('integrationId: No empty strings allowed');
    });

    it('requires title in integrationResponse', () => {
      const payload = {
        integrationResponse: {
          integrationId: 'integration-123',
          description: 'Integration for testing purposes',
          status: 'pending' as const,
          dataStreams: [],
        },
      };

      const result = GetAutoImportIntegrationResponse.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('title: Required');
    });

    it('requires description in integrationResponse', () => {
      const payload = {
        integrationResponse: {
          integrationId: 'integration-123',
          title: 'Test Integration',
          status: 'pending' as const,
          dataStreams: [],
        },
      };

      const result = GetAutoImportIntegrationResponse.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('description: Required');
    });

    it('requires dataStreams in integrationResponse', () => {
      const payload = {
        integrationResponse: {
          integrationId: 'integration-123',
          title: 'Test Integration',
          description: 'Integration for testing purposes',
          status: 'pending' as const,
        },
      };

      const result = GetAutoImportIntegrationResponse.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('dataStreams: Required');
    });

    it('accepts integrationResponse with optional logo', () => {
      const payload = {
        integrationResponse: {
          integrationId: 'integration-123',
          title: 'Test Integration',
          description: 'Integration for testing purposes',
          logo: 'data:image/png;base64,test',
          status: 'pending' as const,
          dataStreams: [],
        },
      };

      const result = GetAutoImportIntegrationResponse.safeParse(payload);
      expectParseSuccess(result);
    });

    it('accepts integrationResponse without logo', () => {
      const payload = {
        integrationResponse: {
          integrationId: 'integration-123',
          title: 'Test Integration',
          description: 'Integration for testing purposes',
          status: 'pending' as const,
          dataStreams: [],
        },
      };

      const result = GetAutoImportIntegrationResponse.safeParse(payload);
      expectParseSuccess(result);
    });

    it('strips unknown properties in integrationResponse', () => {
      const payload = {
        integrationResponse: {
          integrationId: 'integration-123',
          title: 'Test Integration',
          description: 'Integration for testing purposes',
          status: 'pending' as const,
          dataStreams: [],
          unknown: 'property',
        },
      };

      const result = GetAutoImportIntegrationResponse.safeParse(payload);
      expectParseSuccess(result);

      // IntegrationResponse doesn't have strict mode, so unknown properties are stripped
      expect(result.data.integrationResponse).not.toHaveProperty('unknown');
    });

    it('rejects unknown properties at the response level (strict mode)', () => {
      const payload = {
        integrationResponse: {
          integrationId: 'integration-123',
          title: 'Test Integration',
          description: 'Integration for testing purposes',
          status: 'pending' as const,
          dataStreams: [],
        },
        unknown: 'property',
      };

      const result = GetAutoImportIntegrationResponse.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('Unrecognized key');
    });
  });

  describe('GetAllAutoImportIntegrationsResponse', () => {
    it('accepts an empty array', () => {
      const payload: any[] = [];

      const result = GetAllAutoImportIntegrationsResponse.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('accepts an array with multiple integrations', () => {
      const payload = [
        {
          integrationId: 'integration-1',
          title: 'Test Integration',
          totalDataStreamCount: 1,
          successfulDataStreamCount: 0,
          status: 'pending' as const,
        },
        {
          integrationId: 'integration-2',
          title: 'Test Integration',
          totalDataStreamCount: 1,
          successfulDataStreamCount: 1,
          status: 'completed' as const,
        },
      ];

      const result = GetAllAutoImportIntegrationsResponse.safeParse(payload);
      expectParseSuccess(result);
    });

    it('requires integrationId for each integration', () => {
      const payload = [
        {
          title: 'Integration 1',
          totalDataStreamCount: 0,
          successfulDataStreamCount: 0,
          status: 'pending' as const,
        },
      ];

      const result = GetAllAutoImportIntegrationsResponse.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('integrationId: Required');
    });

    it('rejects empty integrationId', () => {
      const payload = [
        {
          integrationId: '   ',
          title: 'Integration 1',
          totalDataStreamCount: 0,
          successfulDataStreamCount: 0,
          status: 'pending' as const,
        },
      ];

      const result = GetAllAutoImportIntegrationsResponse.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('integrationId: No empty strings allowed');
    });

    it('requires title for each integration', () => {
      const payload = [
        {
          integrationId: 'integration-1',
          totalDataStreamCount: 0,
          successfulDataStreamCount: 0,
          status: 'pending' as const,
        },
      ];

      const result = GetAllAutoImportIntegrationsResponse.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('title: Required');
    });

    it('requires totalDataStreamCount for each integration', () => {
      const payload = [
        {
          integrationId: 'integration-1',
          title: 'Test Integration',
          successfulDataStreamCount: 0,
          status: 'pending' as const,
        },
      ];

      const result = GetAllAutoImportIntegrationsResponse.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('totalDataStreamCount: Required');
    });

    it('requires successfulDataStreamCount for each integration', () => {
      const payload = [
        {
          integrationId: 'integration-1',
          title: 'Test Integration',
          totalDataStreamCount: 5,
          status: 'pending' as const,
        },
      ];

      const result = GetAllAutoImportIntegrationsResponse.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('successfulDataStreamCount: Required');
    });

    it('requires status for each integration', () => {
      const payload = [
        {
          integrationId: 'integration-1',
          title: 'Test Integration',
          totalDataStreamCount: 5,
          successfulDataStreamCount: 3,
        },
      ];

      const result = GetAllAutoImportIntegrationsResponse.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('status: Required');
    });

    it('accepts all valid task status values', () => {
      const statuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'] as const;

      statuses.forEach((status) => {
        const payload = [
          {
            integrationId: 'integration-1',
            title: 'Test Integration',
            totalDataStreamCount: 1,
            successfulDataStreamCount: 0,
            status,
          },
        ];

        const result = GetAllAutoImportIntegrationsResponse.safeParse(payload);
        expectParseSuccess(result);
      });
    });

    it('strips unknown properties from each integration', () => {
      const payload = [
        {
          integrationId: 'integration-1',
          title: 'Test Integration',
          totalDataStreamCount: 1,
          successfulDataStreamCount: 0,
          status: 'pending' as const,
          unknown: 'property',
        },
      ];

      const result = GetAllAutoImportIntegrationsResponse.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data[0]).not.toHaveProperty('unknown');
    });
  });

  describe('UpdateAutoImportIntegrationRequestParams', () => {
    it('requires integration_id', () => {
      const result = UpdateAutoImportIntegrationRequestParams.safeParse({});
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('integration_id: Required');
    });

    it('rejects empty integration_id', () => {
      const payload = {
        integration_id: '   ',
      };

      const result = UpdateAutoImportIntegrationRequestParams.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('integration_id: No empty strings allowed');
    });

    it('accepts valid params', () => {
      const payload = {
        integration_id: 'integration-123',
      };

      const result = UpdateAutoImportIntegrationRequestParams.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });
  });

  describe('UpdateAutoImportIntegrationRequestBody', () => {
    it('accepts an empty payload', () => {
      const payload = {};

      const result = UpdateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('accepts description update', () => {
      const payload = {
        description: 'Updated description',
      };

      const result = UpdateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('accepts logo update', () => {
      const payload = {
        logo: 'data:image/png;base64,newlogo',
      };

      const result = UpdateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('accepts dataStreams update', () => {
      const payload = {
        dataStreams: [
          {
            description: 'Updated log data stream',
            inputTypes: [{ name: 'filestream' as const }],
            rawSamples: ['new sample 1', 'new sample 2'],
          },
        ],
      };

      const result = UpdateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('accepts combined updates', () => {
      const payload = {
        description: 'Updated description',
        logo: 'data:image/png;base64,newlogo',
        dataStreams: [
          {
            description: 'Updated log data stream',
          },
        ],
      };

      const result = UpdateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('rejects unknown properties', () => {
      const payload = {
        description: 'Updated description',
        unknown: 'property',
      };

      const result = UpdateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);
    });

    it('rejects empty string for description when provided', () => {
      const payload = {
        description: '   ',
      };

      const result = UpdateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('description: No empty strings allowed');
    });

    it('rejects empty string for logo when provided', () => {
      const payload = {
        logo: '   ',
      };

      const result = UpdateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('logo: No empty strings allowed');
    });
  });

  describe('DeleteAutoImportIntegrationRequestParams', () => {
    it('requires integration_id', () => {
      const result = DeleteAutoImportIntegrationRequestParams.safeParse({});
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('integration_id: Required');
    });

    it('rejects empty integration_id', () => {
      const payload = {
        integration_id: '   ',
      };

      const result = DeleteAutoImportIntegrationRequestParams.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('integration_id: No empty strings allowed');
    });

    it('accepts valid params', () => {
      const payload = {
        integration_id: 'integration-123',
      };

      const result = DeleteAutoImportIntegrationRequestParams.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('strips unknown properties', () => {
      const payload = {
        integration_id: 'integration-123',
        unknown: 'property',
      };

      const result = DeleteAutoImportIntegrationRequestParams.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual({
        integration_id: 'integration-123',
      });
    });
  });

  describe('API Workflow Tests', () => {
    describe('Complete Integration Lifecycle: PUT → GET → PATCH → GET → DELETE', () => {
      it('simulates creating, retrieving, updating, and deleting an integration', () => {
        // Step 1: PUT - Create a new integration
        const createRequest = {
          connectorId: 'test-connector-id',
          integrationId: 'nginx_logs_integration',
          title: 'Nginx Logs Integration',
          description: 'Integration for collecting Nginx access and error logs',
          logo: 'data:image/png;base64,iVBORw0KGgo=',
          dataStreams: [
            createValidDataStream({
              dataStreamId: 'access',
              title: 'access',
              description: 'Nginx access logs',
            }),
            createValidDataStream({
              dataStreamId: 'error',
              title: 'error',
              description: 'Nginx error logs',
            }),
          ],
        };

        const createResult = CreateAutoImportIntegrationRequestBody.safeParse(createRequest);
        expectParseSuccess(createResult);

        // Simulate response
        const createResponse = {
          integration_id: 'nginx-integration-001',
        };
        const createResponseResult = CreateAutoImportIntegrationResponse.safeParse(createResponse);
        expectParseSuccess(createResponseResult);

        // Step 2: GET - Retrieve the created integration
        const getParams = {
          integration_id: 'nginx-integration-001',
        };
        const getParamsResult = GetAutoImportIntegrationRequestParams.safeParse(getParams);
        expectParseSuccess(getParamsResult);

        const getResponse = {
          integrationResponse: createValidIntegrationResponse({
            integrationId: 'nginx-integration-001',
            title: 'Nginx Logs Integration',
            description: 'Integration for collecting Nginx access and error logs',
            logo: 'data:image/png;base64,iVBORw0KGgo=',
            dataStreams: [
              {
                dataStreamId: 'access-ds',
                title: 'access',
                description: 'Nginx access logs',
                inputTypes: [{ name: 'filestream' as const }],
                status: 'pending' as const,
              },
              {
                dataStreamId: 'error-ds',
                title: 'error',
                description: 'Nginx error logs',
                inputTypes: [{ name: 'filestream' as const }],
                status: 'pending' as const,
              },
            ],
          }),
        };
        const getResponseResult = GetAutoImportIntegrationResponse.safeParse(getResponse);
        expectParseSuccess(getResponseResult);

        // Step 3: PATCH - Update the integration
        const updateParams = {
          integration_id: 'nginx-integration-001',
        };
        const updateParamsResult = UpdateAutoImportIntegrationRequestParams.safeParse(updateParams);
        expectParseSuccess(updateParamsResult);

        const updateRequest = {
          description: 'Enhanced integration for collecting Nginx logs with custom parsing',
          dataStreams: [
            {
              description: 'Nginx access logs with extended format',
              rawSamples: [
                '127.0.0.1 - - [01/Jan/2024:12:00:00 +0000] "GET /index.html HTTP/1.1" 200 1234',
                '192.168.1.1 - - [01/Jan/2024:12:01:00 +0000] "POST /api/data HTTP/1.1" 201 567',
              ],
            },
          ],
        };
        const updateRequestResult = UpdateAutoImportIntegrationRequestBody.safeParse(updateRequest);
        expectParseSuccess(updateRequestResult);

        // Step 4: DELETE - Delete the integration
        const deleteParams = {
          integration_id: 'nginx-integration-001',
        };
        const deleteParamsResult = DeleteAutoImportIntegrationRequestParams.safeParse(deleteParams);
        expectParseSuccess(deleteParamsResult);
      });
    });

    describe('Multiple Integrations Workflow: PUT → PUT → GET ALL → DELETE', () => {
      it('simulates managing multiple integrations', () => {
        // Step 1: PUT - Create first integration (Apache)
        const createApache = {
          connectorId: 'test-connector-id',
          integrationId: 'apache_logs',
          title: 'Apache Logs',
          description: 'Apache web server logs integration',
          dataStreams: [
            createValidDataStream({
              dataStreamId: 'access',
              title: 'access',
              description: 'Apache access logs',
            }),
          ],
        };
        const createApacheResult = CreateAutoImportIntegrationRequestBody.safeParse(createApache);
        expectParseSuccess(createApacheResult);

        const apacheResponse = { integration_id: 'apache-001' };
        const apacheResponseResult = CreateAutoImportIntegrationResponse.safeParse(apacheResponse);
        expectParseSuccess(apacheResponseResult);

        // Step 2: PUT - Create second integration (MySQL)
        const createMySQL = {
          connectorId: 'test-connector-id',
          integrationId: 'mysql_logs',
          title: 'MySQL Logs',
          description: 'MySQL database logs integration',
          logo: 'data:image/png;base64,mysql=',
          dataStreams: [
            createValidDataStream({
              dataStreamId: 'error',
              title: 'error',
              description: 'MySQL error logs',
            }),
          ],
        };
        const createMySQLResult = CreateAutoImportIntegrationRequestBody.safeParse(createMySQL);
        expectParseSuccess(createMySQLResult);

        const mysqlResponse = { integration_id: 'mysql-001' };
        const mysqlResponseResult = CreateAutoImportIntegrationResponse.safeParse(mysqlResponse);
        expectParseSuccess(mysqlResponseResult);

        // Step 3: GET ALL - Retrieve all integrations
        const getAllResponse = [
          {
            integrationId: 'apache-001',
            title: 'Apache Logs',
            totalDataStreamCount: 1,
            successfulDataStreamCount: 0,
            status: 'pending' as const,
          },
          {
            integrationId: 'mysql-001',
            title: 'MySQL Logs',
            totalDataStreamCount: 1,
            successfulDataStreamCount: 0,
            status: 'pending' as const,
          },
        ];
        const getAllResponseResult = GetAllAutoImportIntegrationsResponse.safeParse(getAllResponse);
        expectParseSuccess(getAllResponseResult);

        // Step 4: DELETE - Delete MySQL integration
        const deleteMySQLParams = { integration_id: 'mysql-001' };
        const deleteMySQLParamsResult =
          DeleteAutoImportIntegrationRequestParams.safeParse(deleteMySQLParams);
        expectParseSuccess(deleteMySQLParamsResult);

        // Step 5: GET ALL - Verify only Apache remains
        const finalGetAllResponse = [
          {
            integrationId: 'apache-001',
            title: 'Apache Logs',
            totalDataStreamCount: 1,
            successfulDataStreamCount: 0,
            status: 'pending' as const,
          },
        ];
        const finalGetAllResponseResult =
          GetAllAutoImportIntegrationsResponse.safeParse(finalGetAllResponse);
        expectParseSuccess(finalGetAllResponseResult);
      });
    });

    describe('Edge Cases in Workflow', () => {
      it('handles creating integration with multiple input types', () => {
        const createRequest = {
          connectorId: 'test-connector-id',
          integrationId: 'multi_input_integration',
          title: 'Multi-Input Integration',
          description: 'Integration supporting multiple input types',
          dataStreams: [
            {
              dataStreamId: 'logs',
              title: 'logs',
              description: 'Logs from various sources',
              inputTypes: [
                { name: 'filestream' as const },
                { name: 'http_endpoint' as const },
                { name: 'tcp' as const },
              ],
            },
          ],
        };

        const createResult = CreateAutoImportIntegrationRequestBody.safeParse(createRequest);
        expectParseSuccess(createResult);

        const createResponse = { integration_id: 'multi-input-001' };
        const createResponseResult = CreateAutoImportIntegrationResponse.safeParse(createResponse);
        expectParseSuccess(createResponseResult);
      });

      it('handles updating only specific data stream properties', () => {
        const updateParams = { integration_id: 'test-001' };
        const updateParamsResult = UpdateAutoImportIntegrationRequestParams.safeParse(updateParams);
        expectParseSuccess(updateParamsResult);

        const updateRequest = {
          dataStreams: [
            {
              rawSamples: ['updated sample 1', 'updated sample 2', 'updated sample 3'],
            },
          ],
        };
        const updateRequestResult = UpdateAutoImportIntegrationRequestBody.safeParse(updateRequest);
        expectParseSuccess(updateRequestResult);
      });

      it('handles retrieving integration with minimal required fields', () => {
        const getResponse = {
          integrationResponse: {
            integrationId: 'minimal-001',
            title: 'Minimal Integration',
            description: 'A minimal integration',
            status: 'pending' as const,
            dataStreams: [],
          },
        };
        const getResponseResult = GetAutoImportIntegrationResponse.safeParse(getResponse);
        expectParseSuccess(getResponseResult);
      });

      it('handles empty list when no integrations exist', () => {
        const getAllResponse: any[] = [];
        const getAllResponseResult = GetAllAutoImportIntegrationsResponse.safeParse(getAllResponse);
        expectParseSuccess(getAllResponseResult);
      });

      it('validates integrationId format in responses', () => {
        // Valid integrationId formats
        const validIntegrationIds = [
          'integration-123',
          'nginx_integration',
          'apache-logs-2024',
          'my-integration_v1',
        ];

        validIntegrationIds.forEach((integrationId) => {
          const payload = {
            integrationResponse: {
              integrationId,
              title: 'Test Integration',
              description: 'Test description',
              status: 'pending' as const,
              dataStreams: [],
            },
          };

          const result = GetAutoImportIntegrationResponse.safeParse(payload);
          expectParseSuccess(result);
          expect(result.data.integrationResponse.integrationId).toBe(integrationId);
        });
      });

      it('rejects integrationResponse with missing required fields', () => {
        const incompletePayloads = [
          {
            integrationResponse: {
              title: 'Test',
              description: 'Test',
              status: 'pending' as const,
              dataStreams: [],
            },
          },
          {
            integrationResponse: {
              integrationId: 'test',
              description: 'Test',
              status: 'pending' as const,
              dataStreams: [],
            },
          },
          {
            integrationResponse: {
              integrationId: 'test',
              title: 'Test',
              status: 'pending' as const,
              dataStreams: [],
            },
          },
          {
            integrationResponse: {
              integrationId: 'test',
              title: 'Test',
              description: 'Test',
              dataStreams: [],
            },
          },
          {
            integrationResponse: {
              integrationId: 'test',
              title: 'Test',
              description: 'Test',
              status: 'pending' as const,
            },
          },
        ];

        incompletePayloads.forEach((payload) => {
          const result = GetAutoImportIntegrationResponse.safeParse(payload);
          expectParseError(result);
        });
      });

      it('validates integrationId consistency across workflow', () => {
        const integrationId = 'consistent-integration-001';

        // Create
        const createResponse = { integration_id: integrationId };
        const createResult = CreateAutoImportIntegrationResponse.safeParse(createResponse);
        expectParseSuccess(createResult);
        expect(createResult.data.integration_id).toBe(integrationId);

        // Get params
        const getParams = { integration_id: integrationId };
        const getParamsResult = GetAutoImportIntegrationRequestParams.safeParse(getParams);
        expectParseSuccess(getParamsResult);
        expect(getParamsResult.data.integration_id).toBe(integrationId);

        // Get response
        const getResponse = {
          integrationResponse: {
            integrationId,
            title: 'Test',
            description: 'Test',
            status: 'pending' as const,
            dataStreams: [],
          },
        };
        const getResponseResult = GetAutoImportIntegrationResponse.safeParse(getResponse);
        expectParseSuccess(getResponseResult);
        expect(getResponseResult.data.integrationResponse.integrationId).toBe(integrationId);

        // Update params
        const updateParams = { integration_id: integrationId };
        const updateParamsResult = UpdateAutoImportIntegrationRequestParams.safeParse(updateParams);
        expectParseSuccess(updateParamsResult);
        expect(updateParamsResult.data.integration_id).toBe(integrationId);

        // Delete params
        const deleteParams = { integration_id: integrationId };
        const deleteParamsResult = DeleteAutoImportIntegrationRequestParams.safeParse(deleteParams);
        expectParseSuccess(deleteParamsResult);
        expect(deleteParamsResult.data.integration_id).toBe(integrationId);
      });
    });
  });
});
