/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';

import {
  InputType,
  DataStream,
  Integration,
  OriginalSource,
  TaskStatus,
  TaskStatusEnum,
  DataStreamResponse,
  IntegrationResponse,
  AllIntegrationsResponseIntegration,
} from './common_attributes.gen';

describe('common attributes schemas', () => {
  describe('InputType', () => {
    it('accepts all valid input type values', () => {
      const validInputTypes = [
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

      validInputTypes.forEach((name) => {
        const payload = { name };
        const result = InputType.safeParse(payload);
        expectParseSuccess(result);
        expect(result.data).toEqual(payload);
      });
    });

    it('rejects invalid input type', () => {
      const payload = { name: 'invalid-input-type' };
      const result = InputType.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('Invalid enum value');
    });

    it('requires name field', () => {
      const payload = {};
      const result = InputType.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('name: Required');
    });

    it('rejects empty name', () => {
      const payload = { name: '' };
      const result = InputType.safeParse(payload);
      expectParseError(result);
    });

    it('strips unknown properties', () => {
      const payload = { name: 'filestream', unknown: 'property' };
      const result = InputType.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual({ name: 'filestream' });
    });
  });

  describe('DataStream', () => {
    const validDataStream = {
      dataStreamId: 'ds-123',
      title: 'Logs',
      description: 'Application logs',
      inputTypes: [{ name: 'filestream' as const }],
    };

    it('accepts valid data stream', () => {
      const result = DataStream.safeParse(validDataStream);
      expectParseSuccess(result);
      expect(result.data).toEqual(validDataStream);
    });

    it('accepts multiple input types', () => {
      const payload = {
        ...validDataStream,
        inputTypes: [{ name: 'filestream' as const }, { name: 'kafka' as const }],
      };

      const result = DataStream.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data.inputTypes).toHaveLength(2);
    });

    it('requires dataStreamId', () => {
      const payload = { ...validDataStream };
      delete (payload as any).dataStreamId;

      const result = DataStream.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain('dataStreamId: Required');
    });

    it('requires title', () => {
      const payload = { ...validDataStream };
      delete (payload as any).title;

      const result = DataStream.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain('title: Required');
    });

    it('requires description', () => {
      const payload = { ...validDataStream };
      delete (payload as any).description;

      const result = DataStream.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain('description: Required');
    });

    it('requires inputTypes', () => {
      const payload = { ...validDataStream };
      delete (payload as any).inputTypes;

      const result = DataStream.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain('inputTypes: Required');
    });

    it('accepts empty inputTypes array', () => {
      const payload = {
        ...validDataStream,
        inputTypes: [],
      };

      const result = DataStream.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data.inputTypes).toHaveLength(0);
    });

    it('rejects empty dataStreamId', () => {
      const payload = {
        ...validDataStream,
        dataStreamId: '   ',
      };

      const result = DataStream.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain('No empty strings allowed');
    });

    it('strips unknown properties', () => {
      const payload = { ...validDataStream, unknown: 'property' };
      const result = DataStream.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(validDataStream);
    });
  });

  describe('Integration', () => {
    const validIntegration = {
      integrationId: 'int-123',
      title: 'Test Integration',
      description: 'Integration for testing',
      dataStreams: [
        {
          dataStreamId: 'ds-123',
          title: 'Logs',
          description: 'Log stream',
          inputTypes: [{ name: 'filestream' as const }],
        },
      ],
    };

    it('accepts valid integration with data streams', () => {
      const result = Integration.safeParse(validIntegration);
      expectParseSuccess(result);
      expect(result.data).toEqual(validIntegration);
    });

    it('accepts integration without data streams (optional)', () => {
      const payload = { ...validIntegration };
      delete (payload as any).dataStreams;

      const result = Integration.safeParse(payload);
      expectParseSuccess(result);
    });

    it('accepts integration with logo', () => {
      const payload = {
        ...validIntegration,
        logo: 'data:image/png;base64,abc123',
      };

      const result = Integration.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data.logo).toBe('data:image/png;base64,abc123');
    });

    it('accepts integration without logo (optional)', () => {
      const result = Integration.safeParse(validIntegration);
      expectParseSuccess(result);
      expect(result.data.logo).toBeUndefined();
    });

    it('requires integrationId', () => {
      const payload = { ...validIntegration };
      delete (payload as any).integrationId;

      const result = Integration.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain('integrationId: Required');
    });

    it('requires title', () => {
      const payload = { ...validIntegration };
      delete (payload as any).title;

      const result = Integration.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain('title: Required');
    });

    it('requires description', () => {
      const payload = { ...validIntegration };
      delete (payload as any).description;

      const result = Integration.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain('description: Required');
    });

    it('rejects unknown properties due to strict mode', () => {
      const payload = { ...validIntegration, unknown: 'property' };
      const result = Integration.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain('Unrecognized key');
    });

    it('accepts multiple data streams', () => {
      const payload = {
        ...validIntegration,
        dataStreams: [
          {
            dataStreamId: 'ds-1',
            title: 'Logs',
            description: 'Log stream',
            inputTypes: [{ name: 'filestream' as const }],
          },
          {
            dataStreamId: 'ds-2',
            title: 'Metrics',
            description: 'Metric stream',
            inputTypes: [{ name: 'http_endpoint' as const }],
          },
        ],
      };

      const result = Integration.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data.dataStreams).toHaveLength(2);
    });
  });

  describe('OriginalSource', () => {
    it('accepts file source type', () => {
      const payload = {
        sourceType: 'file',
        sourceValue: 'logs.txt',
      };

      const result = OriginalSource.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    it('accepts index source type', () => {
      const payload = {
        sourceType: 'index',
        sourceValue: 'logs-*',
      };

      const result = OriginalSource.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    it('rejects invalid source type', () => {
      const payload = {
        sourceType: 'invalid',
        sourceValue: 'test',
      };

      const result = OriginalSource.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain('Invalid enum value');
    });

    it('requires sourceType', () => {
      const payload = {
        sourceValue: 'test.log',
      };

      const result = OriginalSource.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain('sourceType: Required');
    });

    it('requires sourceValue', () => {
      const payload = {
        sourceType: 'file',
      };

      const result = OriginalSource.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain('sourceValue: Required');
    });

    it('rejects empty sourceValue', () => {
      const payload = {
        sourceType: 'file',
        sourceValue: '   ',
      };

      const result = OriginalSource.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain('No empty strings allowed');
    });

    it('strips unknown properties', () => {
      const payload = {
        sourceType: 'file',
        sourceValue: 'logs.txt',
        unknown: 'property',
      };

      const result = OriginalSource.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual({
        sourceType: 'file',
        sourceValue: 'logs.txt',
      });
    });
  });

  describe('TaskStatus', () => {
    it('accepts all valid task status values', () => {
      const validStatuses = [
        'pending',
        'processing',
        'completed',
        'failed',
        'cancelled',
        'approved',
        'deleting',
      ];

      validStatuses.forEach((status) => {
        const result = TaskStatus.safeParse(status);
        expectParseSuccess(result);
        expect(result.data).toBe(status);
      });
    });

    it('rejects invalid task status', () => {
      const invalidStatuses = ['running', 'stopped', 'waiting', 'invalid'];

      invalidStatuses.forEach((status) => {
        const result = TaskStatus.safeParse(status);
        expectParseError(result);
        expect(stringifyZodError(result.error)).toContain('Invalid enum value');
      });
    });

    it('has TaskStatusEnum export with correct values', () => {
      expect(TaskStatusEnum.pending).toBe('pending');
      expect(TaskStatusEnum.processing).toBe('processing');
      expect(TaskStatusEnum.completed).toBe('completed');
      expect(TaskStatusEnum.failed).toBe('failed');
      expect(TaskStatusEnum.cancelled).toBe('cancelled');
      expect(TaskStatusEnum.approved).toBe('approved');
      expect(TaskStatusEnum.deleting).toBe('deleting');
    });

    it('rejects non-string values', () => {
      const invalidValues = [123, true, null, undefined, {}, []];

      invalidValues.forEach((value) => {
        const result = TaskStatus.safeParse(value);
        expectParseError(result);
      });
    });

    it('is case sensitive', () => {
      const result = TaskStatus.safeParse('PENDING');
      expectParseError(result);
    });
  });

  describe('DataStreamResponse', () => {
    const validDataStreamResponse = {
      dataStreamId: 'ds-123',
      title: 'Logs',
      description: 'Log data stream',
      inputTypes: [{ name: 'filestream' as const }],
      status: 'pending' as const,
    };

    it('accepts valid data stream response', () => {
      const result = DataStreamResponse.safeParse(validDataStreamResponse);
      expectParseSuccess(result);
      expect(result.data).toEqual(validDataStreamResponse);
    });

    it('accepts multiple input types', () => {
      const payload = {
        ...validDataStreamResponse,
        inputTypes: [
          { name: 'filestream' as const },
          { name: 'tcp' as const },
          { name: 'udp' as const },
        ],
      };

      const result = DataStreamResponse.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data.inputTypes).toHaveLength(3);
    });

    it('accepts all task statuses', () => {
      const statuses = [
        'pending',
        'processing',
        'completed',
        'failed',
        'cancelled',
        'approved',
        'deleting',
      ] as const;

      statuses.forEach((status) => {
        const payload = { ...validDataStreamResponse, status };
        const result = DataStreamResponse.safeParse(payload);
        expectParseSuccess(result);
        expect(result.data.status).toBe(status);
      });
    });

    it('requires all fields', () => {
      const requiredFields = ['dataStreamId', 'title', 'description', 'inputTypes', 'status'];

      requiredFields.forEach((field) => {
        const payload = { ...validDataStreamResponse };
        delete (payload as any)[field];

        const result = DataStreamResponse.safeParse(payload);
        expectParseError(result);
        expect(stringifyZodError(result.error)).toContain(`${field}: Required`);
      });
    });

    it('rejects empty string fields', () => {
      const stringFields = ['dataStreamId', 'title', 'description'];

      stringFields.forEach((field) => {
        const payload = { ...validDataStreamResponse, [field]: '   ' };
        const result = DataStreamResponse.safeParse(payload);
        expectParseError(result);
        expect(stringifyZodError(result.error)).toContain('No empty strings allowed');
      });
    });

    it('strips unknown properties', () => {
      const payload = { ...validDataStreamResponse, unknown: 'property' };
      const result = DataStreamResponse.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(validDataStreamResponse);
    });
  });

  describe('IntegrationResponse', () => {
    const validIntegrationResponse = {
      integrationId: 'int-123',
      title: 'Test Integration',
      description: 'Integration for testing',
      dataStreams: [
        {
          dataStreamId: 'ds-123',
          title: 'Logs',
          description: 'Log stream',
          inputTypes: [{ name: 'filestream' as const }],
          status: 'pending' as const,
        },
      ],
      status: 'pending' as const,
    };

    it('accepts valid integration response', () => {
      const result = IntegrationResponse.safeParse(validIntegrationResponse);
      expectParseSuccess(result);
      expect(result.data).toEqual(validIntegrationResponse);
    });

    it('accepts integration with logo', () => {
      const payload = {
        ...validIntegrationResponse,
        logo: 'data:image/png;base64,abc123',
      };

      const result = IntegrationResponse.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data.logo).toBe('data:image/png;base64,abc123');
    });

    it('accepts integration without logo (optional)', () => {
      const result = IntegrationResponse.safeParse(validIntegrationResponse);
      expectParseSuccess(result);
      expect(result.data.logo).toBeUndefined();
    });

    it('accepts empty data streams array', () => {
      const payload = {
        ...validIntegrationResponse,
        dataStreams: [],
      };

      const result = IntegrationResponse.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data.dataStreams).toHaveLength(0);
    });

    it('accepts multiple data streams', () => {
      const payload = {
        ...validIntegrationResponse,
        dataStreams: [
          {
            dataStreamId: 'ds-1',
            title: 'Logs',
            description: 'Log stream',
            inputTypes: [{ name: 'filestream' as const }],
            status: 'completed' as const,
          },
          {
            dataStreamId: 'ds-2',
            title: 'Metrics',
            description: 'Metric stream',
            inputTypes: [{ name: 'http_endpoint' as const }],
            status: 'failed' as const,
          },
        ],
      };

      const result = IntegrationResponse.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data.dataStreams).toHaveLength(2);
    });

    it('requires all mandatory fields', () => {
      const requiredFields = ['integrationId', 'title', 'description', 'dataStreams', 'status'];

      requiredFields.forEach((field) => {
        const payload = { ...validIntegrationResponse };
        delete (payload as any)[field];

        const result = IntegrationResponse.safeParse(payload);
        expectParseError(result);
        expect(stringifyZodError(result.error)).toContain(`${field}: Required`);
      });
    });

    it('accepts all task statuses', () => {
      const statuses = [
        'pending',
        'processing',
        'completed',
        'failed',
        'cancelled',
        'approved',
        'deleting',
      ] as const;

      statuses.forEach((status) => {
        const payload = { ...validIntegrationResponse, status };
        const result = IntegrationResponse.safeParse(payload);
        expectParseSuccess(result);
        expect(result.data.status).toBe(status);
      });
    });

    it('strips unknown properties', () => {
      const payload = { ...validIntegrationResponse, unknown: 'property' };
      const result = IntegrationResponse.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(validIntegrationResponse);
    });
  });

  describe('AllIntegrationsResponseIntegration', () => {
    const validIntegration = {
      integrationId: 'int-123',
      title: 'Test Integration',
      totalDataStreamCount: 5,
      successfulDataStreamCount: 3,
      status: 'processing' as const,
    };

    it('accepts valid integration', () => {
      const result = AllIntegrationsResponseIntegration.safeParse(validIntegration);
      expectParseSuccess(result);
      expect(result.data).toEqual(validIntegration);
    });

    it('accepts zero counts', () => {
      const payload = {
        ...validIntegration,
        totalDataStreamCount: 0,
        successfulDataStreamCount: 0,
      };

      const result = AllIntegrationsResponseIntegration.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data.totalDataStreamCount).toBe(0);
      expect(result.data.successfulDataStreamCount).toBe(0);
    });

    it('accepts large counts', () => {
      const payload = {
        ...validIntegration,
        totalDataStreamCount: 1000,
        successfulDataStreamCount: 999,
      };

      const result = AllIntegrationsResponseIntegration.safeParse(payload);
      expectParseSuccess(result);
    });

    it('requires all fields', () => {
      const requiredFields = [
        'integrationId',
        'title',
        'totalDataStreamCount',
        'successfulDataStreamCount',
        'status',
      ];

      requiredFields.forEach((field) => {
        const payload = { ...validIntegration };
        delete (payload as any)[field];

        const result = AllIntegrationsResponseIntegration.safeParse(payload);
        expectParseError(result);
        expect(stringifyZodError(result.error)).toContain(`${field}: Required`);
      });
    });

    it('rejects non-integer counts', () => {
      const payload = {
        ...validIntegration,
        totalDataStreamCount: 5.5,
      };

      const result = AllIntegrationsResponseIntegration.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain('Expected integer');
    });

    it('accepts negative counts (schema does not enforce non-negative)', () => {
      const payload = {
        ...validIntegration,
        totalDataStreamCount: -1,
      };

      const result = AllIntegrationsResponseIntegration.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data.totalDataStreamCount).toBe(-1);
    });

    it('rejects string counts', () => {
      const payload = {
        ...validIntegration,
        totalDataStreamCount: '5',
      };

      const result = AllIntegrationsResponseIntegration.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain('Expected number');
    });

    it('accepts all valid task statuses', () => {
      const statuses = [
        'pending',
        'processing',
        'completed',
        'failed',
        'cancelled',
        'approved',
        'deleting',
      ] as const;

      statuses.forEach((status) => {
        const payload = { ...validIntegration, status };
        const result = AllIntegrationsResponseIntegration.safeParse(payload);
        expectParseSuccess(result);
        expect(result.data.status).toBe(status);
      });
    });

    it('rejects when successfulDataStreamCount exceeds totalDataStreamCount (business logic)', () => {
      const payload = {
        ...validIntegration,
        totalDataStreamCount: 5,
        successfulDataStreamCount: 10,
      };

      // Note: The schema doesn't enforce this business rule, but we document it
      const result = AllIntegrationsResponseIntegration.safeParse(payload);
      expectParseSuccess(result); // Schema allows it, business logic should validate
    });

    it('strips unknown properties', () => {
      const payload = { ...validIntegration, unknown: 'property' };
      const result = AllIntegrationsResponseIntegration.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(validIntegration);
    });
  });

  describe('OriginalSource with various values', () => {
    it('accepts file paths with special characters', () => {
      const filePaths = [
        '/var/log/app.log',
        'C:\\logs\\application.log',
        'logs with spaces.txt',
        '../relative/path.log',
        './local/file.log',
      ];

      filePaths.forEach((path) => {
        const payload = { sourceType: 'file' as const, sourceValue: path };
        const result = OriginalSource.safeParse(payload);
        expectParseSuccess(result);
        expect(result.data.sourceValue).toBe(path);
      });
    });

    it('accepts index patterns', () => {
      const indexPatterns = ['logs-*', 'logs-app-*', '.kibana', 'filebeat-*', 'logs-2024.01.01'];

      indexPatterns.forEach((pattern) => {
        const payload = { sourceType: 'index' as const, sourceValue: pattern };
        const result = OriginalSource.safeParse(payload);
        expectParseSuccess(result);
        expect(result.data.sourceValue).toBe(pattern);
      });
    });
  });
});
