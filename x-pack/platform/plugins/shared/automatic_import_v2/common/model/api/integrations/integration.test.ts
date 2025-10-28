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
  GetAutoImportIntegrationsResponse,
  UpdateAutoImportIntegrationRequestBody,
  UpdateAutoImportIntegrationRequestParams,
} from './integration.gen';

describe('integration schemas', () => {
  describe('CreateAutoImportIntegrationRequestBody', () => {
    const validPayload = {
      title: 'Test Integration',
      description: 'Integration for testing purposes',
      logo: 'data:image/png;base64,abc123',
      dataStreams: [
        {
          title: 'logs',
          description: 'Log data stream',
          inputTypes: [{ name: 'filestream' as const }],
          rawSamples: ['sample log 1', 'sample log 2'],
        },
      ],
    };

    it('accepts a valid payload', () => {
      const result = CreateAutoImportIntegrationRequestBody.safeParse(validPayload);
      expectParseSuccess(result);

      expect(result.data).toEqual(validPayload);
    });

    it('accepts a payload with multiple data streams', () => {
      const payload = {
        ...validPayload,
        dataStreams: [
          {
            title: 'logs',
            description: 'Log data stream',
            inputTypes: [{ name: 'filestream' as const }],
            rawSamples: ['sample log 1'],
          },
          {
            title: 'metrics',
            description: 'Metrics data stream',
            inputTypes: [{ name: 'http_endpoint' as const }],
            rawSamples: ['sample metric 1'],
          },
        ],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('accepts integration without logo', () => {
      const payload = {
        title: 'Test Integration',
        description: 'Integration for testing purposes',
        dataStreams: [
          {
            title: 'logs',
            description: 'Log data stream',
            inputTypes: [{ name: 'filestream' as const }],
            rawSamples: ['sample log 1'],
          },
        ],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
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
        description: 'Integration for testing purposes',
        dataStreams: [
          {
            title: 'logs',
            description: 'Log data stream',
            inputTypes: [{ name: 'filestream' as const }],
            rawSamples: ['sample log 1'],
          },
        ],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('title: Required');
    });

    it('requires description', () => {
      const payload = {
        title: 'Test Integration',
        dataStreams: [
          {
            title: 'logs',
            description: 'Log data stream',
            inputTypes: [{ name: 'filestream' as const }],
            rawSamples: ['sample log 1'],
          },
        ],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('description: Required');
    });

    it('requires dataStreams', () => {
      const payload = {
        title: 'Test Integration',
        description: 'Integration for testing purposes',
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('dataStreams: Required');
    });

    it('requires at least one data stream', () => {
      const payload = {
        title: 'Test Integration',
        description: 'Integration for testing purposes',
        dataStreams: [],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('Array must contain at least 1 element(s)');
    });

    it('requires data stream title', () => {
      const payload = {
        title: 'Test Integration',
        description: 'Integration for testing purposes',
        dataStreams: [
          {
            description: 'Log data stream',
            inputTypes: [{ name: 'filestream' as const }],
            rawSamples: ['sample log 1'],
          },
        ],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('title: Required');
    });

    it('requires data stream description', () => {
      const payload = {
        title: 'Test Integration',
        description: 'Integration for testing purposes',
        dataStreams: [
          {
            title: 'logs',
            inputTypes: [{ name: 'filestream' as const }],
            rawSamples: ['sample log 1'],
          },
        ],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('description: Required');
    });

    it('requires data stream inputTypes', () => {
      const payload = {
        title: 'Test Integration',
        description: 'Integration for testing purposes',
        dataStreams: [
          {
            title: 'logs',
            description: 'Log data stream',
            rawSamples: ['sample log 1'],
          },
        ],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('inputTypes: Required');
    });

    it('requires data stream rawSamples', () => {
      const payload = {
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

      expect(stringifyZodError(result.error)).toContain('rawSamples: Required');
    });

    it('requires at least one input type', () => {
      const payload = {
        title: 'Test Integration',
        description: 'Integration for testing purposes',
        dataStreams: [
          {
            title: 'logs',
            description: 'Log data stream',
            inputTypes: [],
            rawSamples: ['sample log 1'],
          },
        ],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('Array must contain at least 1 element(s)');
    });

    it('rejects invalid input type', () => {
      const payload = {
        title: 'Test Integration',
        description: 'Integration for testing purposes',
        dataStreams: [
          {
            title: 'logs',
            description: 'Log data stream',
            inputTypes: [{ name: 'invalid-type' }],
            rawSamples: ['sample log 1'],
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
          title: 'Test Integration',
          description: 'Integration for testing purposes',
          dataStreams: [
            {
              title: 'logs',
              description: 'Log data stream',
              inputTypes: [{ name: inputType }],
              rawSamples: ['sample log 1'],
            },
          ],
        };

        const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
        expectParseSuccess(result);
      });
    });

    it('rejects empty string for title', () => {
      const payload = {
        title: '   ',
        description: 'Integration for testing purposes',
        dataStreams: [
          {
            title: 'logs',
            description: 'Log data stream',
            inputTypes: [{ name: 'filestream' as const }],
            rawSamples: ['sample log 1'],
          },
        ],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('title: No empty strings allowed');
    });

    it('rejects empty string for description', () => {
      const payload = {
        title: 'Test Integration',
        description: '   ',
        dataStreams: [
          {
            title: 'logs',
            description: 'Log data stream',
            inputTypes: [{ name: 'filestream' as const }],
            rawSamples: ['sample log 1'],
          },
        ],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('description: No empty strings allowed');
    });

    it('rejects empty string for logo when provided', () => {
      const payload = {
        title: 'Test Integration',
        description: 'Integration for testing purposes',
        logo: '   ',
        dataStreams: [
          {
            title: 'logs',
            description: 'Log data stream',
            inputTypes: [{ name: 'filestream' as const }],
            rawSamples: ['sample log 1'],
          },
        ],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('logo: No empty strings allowed');
    });

    it('rejects empty string for data stream title', () => {
      const payload = {
        title: 'Test Integration',
        description: 'Integration for testing purposes',
        dataStreams: [
          {
            title: '   ',
            description: 'Log data stream',
            inputTypes: [{ name: 'filestream' as const }],
            rawSamples: ['sample log 1'],
          },
        ],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('title: No empty strings allowed');
    });

    it('rejects empty string for data stream description', () => {
      const payload = {
        title: 'Test Integration',
        description: 'Integration for testing purposes',
        dataStreams: [
          {
            title: 'logs',
            description: '   ',
            inputTypes: [{ name: 'filestream' as const }],
            rawSamples: ['sample log 1'],
          },
        ],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('description: No empty strings allowed');
    });

    it('requires at least one raw sample', () => {
      const payload = {
        title: 'Test Integration',
        description: 'Integration for testing purposes',
        dataStreams: [
          {
            title: 'logs',
            description: 'Log data stream',
            inputTypes: [{ name: 'filestream' as const }],
            rawSamples: [],
          },
        ],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('Array must contain at least 1 element(s)');
    });

    it('rejects empty string in raw samples', () => {
      const payload = {
        title: 'Test Integration',
        description: 'Integration for testing purposes',
        dataStreams: [
          {
            title: 'logs',
            description: 'Log data stream',
            inputTypes: [{ name: 'filestream' as const }],
            rawSamples: ['sample log 1', '   ', 'sample log 3'],
          },
        ],
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('No empty strings allowed');
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

      // Unknown properties are stripped out
      expect(result.data).toEqual({
        integration_id: 'integration-123',
      });
    });
  });

  describe('GetAutoImportIntegrationResponse', () => {
    const validIntegration = {
      integration_id: 'integration-123',
      title: 'Test Integration',
      description: 'Integration for testing purposes',
      logo: 'data:image/png;base64,abc123',
      dataStreams: [
        {
          title: 'logs',
          description: 'Log data stream',
          inputTypes: [{ name: 'filestream' as const }],
          rawSamples: ['sample log 1', 'sample log 2'],
        },
      ],
    };

    it('requires integration field', () => {
      const result = GetAutoImportIntegrationResponse.safeParse({});
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('integration: Required');
    });

    it('accepts a valid response with full integration', () => {
      const payload = {
        integration: validIntegration,
      };

      const result = GetAutoImportIntegrationResponse.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('accepts integration with minimal fields', () => {
      const payload = {
        integration: {
          integration_id: 'integration-123',
        },
      };

      const result = GetAutoImportIntegrationResponse.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('requires integration_id in integration object', () => {
      const payload = {
        integration: {
          title: 'Test Integration',
          description: 'Integration for testing purposes',
        },
      };

      const result = GetAutoImportIntegrationResponse.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('integration_id: Required');
    });
  });

  describe('GetAutoImportIntegrationsResponse', () => {
    it('accepts an empty array', () => {
      const payload: any[] = [];

      const result = GetAutoImportIntegrationsResponse.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('accepts an array with multiple integrations', () => {
      const payload = [
        {
          integration_id: 'integration-1',
          title: 'Integration 1',
          description: 'First integration',
        },
        {
          integration_id: 'integration-2',
          title: 'Integration 2',
          description: 'Second integration',
          logo: 'data:image/png;base64,xyz',
        },
      ];

      const result = GetAutoImportIntegrationsResponse.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('requires integration_id for each integration', () => {
      const payload = [
        {
          title: 'Integration 1',
          description: 'First integration',
        },
      ];

      const result = GetAutoImportIntegrationsResponse.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('integration_id: Required');
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

    it('accepts dataStreams with partial updates', () => {
      const payload = {
        dataStreams: [
          {
            description: 'Only description updated',
          },
          {
            inputTypes: [{ name: 'http_endpoint' as const }],
          },
          {
            rawSamples: ['new sample'],
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

    it('rejects empty string for data stream description when provided', () => {
      const payload = {
        dataStreams: [
          {
            description: '   ',
          },
        ],
      };

      const result = UpdateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('description: No empty strings allowed');
    });

    it('rejects empty string in raw samples', () => {
      const payload = {
        dataStreams: [
          {
            rawSamples: ['valid sample', '   ', 'another valid sample'],
          },
        ],
      };

      const result = UpdateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('No empty strings allowed');
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
          title: 'Nginx Logs Integration',
          description: 'Integration for collecting Nginx access and error logs',
          logo: 'data:image/png;base64,iVBORw0KGgo=',
          dataStreams: [
            {
              title: 'access',
              description: 'Nginx access logs',
              inputTypes: [{ name: 'filestream' as const }],
              rawSamples: [
                '127.0.0.1 - - [01/Jan/2024:12:00:00 +0000] "GET /index.html HTTP/1.1" 200 1234',
              ],
            },
            {
              title: 'error',
              description: 'Nginx error logs',
              inputTypes: [{ name: 'filestream' as const }],
              rawSamples: ['2024/01/01 12:00:00 [error] 12345#0: *1 connect() failed'],
            },
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
          integration: {
            integration_id: 'nginx-integration-001',
            title: 'Nginx Logs Integration',
            description: 'Integration for collecting Nginx access and error logs',
            logo: 'data:image/png;base64,iVBORw0KGgo=',
            dataStreams: [
              {
                title: 'access',
                description: 'Nginx access logs',
                inputTypes: [{ name: 'filestream' as const }],
                rawSamples: [
                  '127.0.0.1 - - [01/Jan/2024:12:00:00 +0000] "GET /index.html HTTP/1.1" 200 1234',
                ],
              },
              {
                title: 'error',
                description: 'Nginx error logs',
                inputTypes: [{ name: 'filestream' as const }],
                rawSamples: ['2024/01/01 12:00:00 [error] 12345#0: *1 connect() failed'],
              },
            ],
          },
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

        // Step 4: GET - Retrieve the updated integration
        const getUpdatedResponse = {
          integration: {
            integration_id: 'nginx-integration-001',
            title: 'Nginx Logs Integration',
            description: 'Enhanced integration for collecting Nginx logs with custom parsing',
            logo: 'data:image/png;base64,iVBORw0KGgo=',
            dataStreams: [
              {
                title: 'access',
                description: 'Nginx access logs with extended format',
                inputTypes: [{ name: 'filestream' as const }],
                rawSamples: [
                  '127.0.0.1 - - [01/Jan/2024:12:00:00 +0000] "GET /index.html HTTP/1.1" 200 1234',
                  '192.168.1.1 - - [01/Jan/2024:12:01:00 +0000] "POST /api/data HTTP/1.1" 201 567',
                ],
              },
              {
                title: 'error',
                description: 'Nginx error logs',
                inputTypes: [{ name: 'filestream' as const }],
                rawSamples: ['2024/01/01 12:00:00 [error] 12345#0: *1 connect() failed'],
              },
            ],
          },
        };
        const getUpdatedResponseResult =
          GetAutoImportIntegrationResponse.safeParse(getUpdatedResponse);
        expectParseSuccess(getUpdatedResponseResult);

        // Step 5: DELETE - Delete the integration
        const deleteParams = {
          integration_id: 'nginx-integration-001',
        };
        const deleteParamsResult = DeleteAutoImportIntegrationRequestParams.safeParse(deleteParams);
        expectParseSuccess(deleteParamsResult);
      });
    });

    describe('Multiple Integrations Workflow: PUT → PUT → GET ALL → PATCH → DELETE', () => {
      it('simulates managing multiple integrations', () => {
        // Step 1: PUT - Create first integration (Apache)
        const createApache = {
          title: 'Apache Logs',
          description: 'Apache web server logs integration',
          dataStreams: [
            {
              title: 'access',
              description: 'Apache access logs',
              inputTypes: [{ name: 'filestream' as const }],
              rawSamples: ['192.168.1.1 - - [01/Jan/2024:12:00:00] "GET / HTTP/1.1" 200'],
            },
          ],
        };
        const createApacheResult = CreateAutoImportIntegrationRequestBody.safeParse(createApache);
        expectParseSuccess(createApacheResult);

        const apacheResponse = { integration_id: 'apache-001' };
        const apacheResponseResult = CreateAutoImportIntegrationResponse.safeParse(apacheResponse);
        expectParseSuccess(apacheResponseResult);

        // Step 2: PUT - Create second integration (MySQL)
        const createMySQL = {
          title: 'MySQL Logs',
          description: 'MySQL database logs integration',
          logo: 'data:image/png;base64,mysql=',
          dataStreams: [
            {
              title: 'error',
              description: 'MySQL error logs',
              inputTypes: [{ name: 'filestream' as const }],
              rawSamples: ['2024-01-01T12:00:00.123456Z 0 [ERROR] [MY-123456] Error message'],
            },
            {
              title: 'slow-query',
              description: 'MySQL slow query logs',
              inputTypes: [{ name: 'filestream' as const }],
              rawSamples: ['# Time: 2024-01-01T12:00:00.123456Z'],
            },
          ],
        };
        const createMySQLResult = CreateAutoImportIntegrationRequestBody.safeParse(createMySQL);
        expectParseSuccess(createMySQLResult);

        const mysqlResponse = { integration_id: 'mysql-001' };
        const mysqlResponseResult = CreateAutoImportIntegrationResponse.safeParse(mysqlResponse);
        expectParseSuccess(mysqlResponseResult);

        // Step 3: GET - Retrieve all integrations
        const getAllResponse = [
          {
            integration_id: 'apache-001',
            title: 'Apache Logs',
            description: 'Apache web server logs integration',
            dataStreams: [
              {
                title: 'access',
                description: 'Apache access logs',
                inputTypes: [{ name: 'filestream' as const }],
                rawSamples: ['192.168.1.1 - - [01/Jan/2024:12:00:00] "GET / HTTP/1.1" 200'],
              },
            ],
          },
          {
            integration_id: 'mysql-001',
            title: 'MySQL Logs',
            description: 'MySQL database logs integration',
            logo: 'data:image/png;base64,mysql=',
            dataStreams: [
              {
                title: 'error',
                description: 'MySQL error logs',
                inputTypes: [{ name: 'filestream' as const }],
                rawSamples: ['2024-01-01T12:00:00.123456Z 0 [ERROR] [MY-123456] Error message'],
              },
              {
                title: 'slow-query',
                description: 'MySQL slow query logs',
                inputTypes: [{ name: 'filestream' as const }],
                rawSamples: ['# Time: 2024-01-01T12:00:00.123456Z'],
              },
            ],
          },
        ];
        const getAllResponseResult = GetAutoImportIntegrationsResponse.safeParse(getAllResponse);
        expectParseSuccess(getAllResponseResult);

        // Step 4: PATCH - Update Apache integration
        const updateApacheParams = { integration_id: 'apache-001' };
        const updateApacheParamsResult =
          UpdateAutoImportIntegrationRequestParams.safeParse(updateApacheParams);
        expectParseSuccess(updateApacheParamsResult);

        const updateApacheRequest = {
          logo: 'data:image/png;base64,apache-logo=',
          description: 'Comprehensive Apache web server logs integration',
        };
        const updateApacheRequestResult =
          UpdateAutoImportIntegrationRequestBody.safeParse(updateApacheRequest);
        expectParseSuccess(updateApacheRequestResult);

        // Step 5: DELETE - Delete MySQL integration
        const deleteMySQLParams = { integration_id: 'mysql-001' };
        const deleteMySQLParamsResult =
          DeleteAutoImportIntegrationRequestParams.safeParse(deleteMySQLParams);
        expectParseSuccess(deleteMySQLParamsResult);

        // Step 6: GET ALL - Verify only Apache remains
        const finalGetAllResponse = [
          {
            integration_id: 'apache-001',
            title: 'Apache Logs',
            description: 'Comprehensive Apache web server logs integration',
            logo: 'data:image/png;base64,apache-logo=',
            dataStreams: [
              {
                title: 'access',
                description: 'Apache access logs',
                inputTypes: [{ name: 'filestream' as const }],
                rawSamples: ['192.168.1.1 - - [01/Jan/2024:12:00:00] "GET / HTTP/1.1" 200'],
              },
            ],
          },
        ];
        const finalGetAllResponseResult =
          GetAutoImportIntegrationsResponse.safeParse(finalGetAllResponse);
        expectParseSuccess(finalGetAllResponseResult);
      });
    });

    describe('Edge Cases in Workflow', () => {
      it('handles creating integration with multiple input types', () => {
        const createRequest = {
          title: 'Multi-Input Integration',
          description: 'Integration supporting multiple input types',
          dataStreams: [
            {
              title: 'logs',
              description: 'Logs from various sources',
              inputTypes: [
                { name: 'filestream' as const },
                { name: 'http_endpoint' as const },
                { name: 'tcp' as const },
              ],
              rawSamples: ['log sample 1', 'log sample 2'],
            },
          ],
        };

        const createResult = CreateAutoImportIntegrationRequestBody.safeParse(createRequest);
        expectParseSuccess(createResult);

        const createResponse = { integration_id: 'multi-input-001' };
        const createResponseResult = CreateAutoImportIntegrationResponse.safeParse(createResponse);
        expectParseSuccess(createResponseResult);

        const getResponse = {
          integration: {
            integration_id: 'multi-input-001',
            ...createRequest,
          },
        };
        const getResponseResult = GetAutoImportIntegrationResponse.safeParse(getResponse);
        expectParseSuccess(getResponseResult);
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

      it('handles retrieving integration with empty optional fields', () => {
        const getResponse = {
          integration: {
            integration_id: 'minimal-001',
          },
        };
        const getResponseResult = GetAutoImportIntegrationResponse.safeParse(getResponse);
        expectParseSuccess(getResponseResult);
      });

      it('handles empty list when no integrations exist', () => {
        const getAllResponse: any[] = [];
        const getAllResponseResult = GetAutoImportIntegrationsResponse.safeParse(getAllResponse);
        expectParseSuccess(getAllResponseResult);
      });
    });
  });
});
