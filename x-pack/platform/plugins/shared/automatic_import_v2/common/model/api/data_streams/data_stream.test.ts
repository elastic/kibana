/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';

import {
  StopAutoImportDataStreamRequestParams,
  UploadSamplesToDataStreamRequestParams,
  UploadSamplesToDataStreamRequestBody,
  UploadSamplesToDataStreamResponse,
} from './data_stream.gen';

describe('data stream schemas', () => {
  describe('StopAutoImportDataStreamRequestParams', () => {
    it('requires integration_id', () => {
      const payload = {
        data_stream_id: 'data-stream-123',
      };

      const result = StopAutoImportDataStreamRequestParams.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('integration_id: Required');
    });

    it('requires data_stream_id', () => {
      const payload = {
        integration_id: 'integration-123',
      };

      const result = StopAutoImportDataStreamRequestParams.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('data_stream_id: Required');
    });

    it('rejects empty integration_id', () => {
      const payload = {
        integration_id: '   ',
        data_stream_id: 'data-stream-123',
      };

      const result = StopAutoImportDataStreamRequestParams.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('integration_id: No empty strings allowed');
    });

    it('rejects empty data_stream_id', () => {
      const payload = {
        integration_id: 'integration-123',
        data_stream_id: '   ',
      };

      const result = StopAutoImportDataStreamRequestParams.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('data_stream_id: No empty strings allowed');
    });

    it('accepts valid params', () => {
      const payload = {
        integration_id: 'integration-123',
        data_stream_id: 'data-stream-123',
      };

      const result = StopAutoImportDataStreamRequestParams.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('strips unknown properties', () => {
      const payload = {
        integration_id: 'integration-123',
        data_stream_id: 'data-stream-123',
        unknown: 'property',
      };

      const result = StopAutoImportDataStreamRequestParams.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual({
        integration_id: 'integration-123',
        data_stream_id: 'data-stream-123',
      });
    });

    it('accepts params with various valid IDs', () => {
      const testCases = [
        {
          integration_id: 'integration-001',
          data_stream_id: 'data-stream-001',
        },
        {
          integration_id: 'my-integration',
          data_stream_id: 'my-data-stream',
        },
        {
          integration_id: 'integration_with_underscores',
          data_stream_id: 'data_stream_with_underscores',
        },
        {
          integration_id: 'integration-with-dashes',
          data_stream_id: 'data-stream-with-dashes',
        },
        {
          integration_id: 'integration123',
          data_stream_id: 'datastream123',
        },
      ];

      testCases.forEach((payload) => {
        const result = StopAutoImportDataStreamRequestParams.safeParse(payload);
        expectParseSuccess(result);
        expect(result.data).toEqual(payload);
      });
    });

    it('rejects both empty integration_id and data_stream_id', () => {
      const payload = {
        integration_id: '   ',
        data_stream_id: '   ',
      };

      const result = StopAutoImportDataStreamRequestParams.safeParse(payload);
      expectParseError(result);

      const errorMessage = stringifyZodError(result.error);
      expect(errorMessage).toContain('integration_id: No empty strings allowed');
      expect(errorMessage).toContain('data_stream_id: No empty strings allowed');
    });
  });

  describe('UploadSamplesToDataStreamRequestParams', () => {
    it('requires integration_id', () => {
      const payload = {
        data_stream_id: 'data-stream-123',
      };

      const result = UploadSamplesToDataStreamRequestParams.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('integration_id: Required');
    });

    it('requires data_stream_id', () => {
      const payload = {
        integration_id: 'integration-123',
      };

      const result = UploadSamplesToDataStreamRequestParams.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('data_stream_id: Required');
    });

    it('rejects empty integration_id', () => {
      const payload = {
        integration_id: '   ',
        data_stream_id: 'data-stream-123',
      };

      const result = UploadSamplesToDataStreamRequestParams.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('integration_id: No empty strings allowed');
    });

    it('rejects empty data_stream_id', () => {
      const payload = {
        integration_id: 'integration-123',
        data_stream_id: '   ',
      };

      const result = UploadSamplesToDataStreamRequestParams.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('data_stream_id: No empty strings allowed');
    });

    it('accepts valid params', () => {
      const payload = {
        integration_id: 'integration-123',
        data_stream_id: 'data-stream-123',
      };

      const result = UploadSamplesToDataStreamRequestParams.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('strips unknown properties', () => {
      const payload = {
        integration_id: 'integration-123',
        data_stream_id: 'data-stream-123',
        unknown: 'property',
      };

      const result = UploadSamplesToDataStreamRequestParams.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual({
        integration_id: 'integration-123',
        data_stream_id: 'data-stream-123',
      });
    });
  });

  describe('UploadSamplesToDataStreamRequestBody', () => {
    const validOriginalSource = {
      sourceType: 'file' as const,
      sourceValue: 'test.log',
    };

    it('requires samples array', () => {
      const payload = {
        originalSource: validOriginalSource,
      };

      const result = UploadSamplesToDataStreamRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('samples: Required');
    });

    it('requires originalSource', () => {
      const payload = {
        samples: ['Sample 1'],
      };

      const result = UploadSamplesToDataStreamRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('originalSource: Required');
    });

    it('rejects non-array samples', () => {
      const payload = {
        samples: 'not-an-array',
        originalSource: validOriginalSource,
      };

      const result = UploadSamplesToDataStreamRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('samples: Expected array');
    });

    it('accepts empty samples array', () => {
      const payload = {
        samples: [],
        originalSource: validOriginalSource,
      };

      const result = UploadSamplesToDataStreamRequestBody.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('accepts single sample', () => {
      const payload = {
        samples: ['Sample log line 1'],
        originalSource: validOriginalSource,
      };

      const result = UploadSamplesToDataStreamRequestBody.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('accepts multiple samples', () => {
      const payload = {
        samples: [
          'Sample log line 1',
          'Sample log line 2',
          'Sample log line 3',
          'Sample log line 4',
        ],
        originalSource: validOriginalSource,
      };

      const result = UploadSamplesToDataStreamRequestBody.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('accepts samples with special characters', () => {
      const payload = {
        samples: [
          'Log with "quotes"',
          'Log with \\backslashes\\',
          'Log with \nnewlines',
          'Log with JSON: {"key": "value"}',
        ],
        originalSource: validOriginalSource,
      };

      const result = UploadSamplesToDataStreamRequestBody.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('rejects samples with non-string elements', () => {
      const payload = {
        samples: ['Valid string', 123, 'Another string'],
        originalSource: validOriginalSource,
      };

      const result = UploadSamplesToDataStreamRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('Expected string');
    });

    it('accepts large number of samples', () => {
      const payload = {
        samples: Array.from({ length: 1000 }, (_, i) => `Log line ${i}`),
        originalSource: validOriginalSource,
      };

      const result = UploadSamplesToDataStreamRequestBody.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data.samples).toHaveLength(1000);
    });

    it('accepts file source type', () => {
      const payload = {
        samples: ['Sample 1'],
        originalSource: {
          sourceType: 'file' as const,
          sourceValue: 'access.log',
        },
      };

      const result = UploadSamplesToDataStreamRequestBody.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('accepts index source type', () => {
      const payload = {
        samples: ['Sample 1'],
        originalSource: {
          sourceType: 'index' as const,
          sourceValue: 'logs-*',
        },
      };

      const result = UploadSamplesToDataStreamRequestBody.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('rejects invalid source type', () => {
      const payload = {
        samples: ['Sample 1'],
        originalSource: {
          sourceType: 'invalid',
          sourceValue: 'test',
        },
      };

      const result = UploadSamplesToDataStreamRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('Invalid enum value');
    });

    it('strips unknown properties', () => {
      const payload = {
        samples: ['Sample 1', 'Sample 2'],
        originalSource: validOriginalSource,
        unknown: 'property',
      };

      const result = UploadSamplesToDataStreamRequestBody.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual({
        samples: ['Sample 1', 'Sample 2'],
        originalSource: validOriginalSource,
      });
    });
  });

  describe('UploadSamplesToDataStreamResponse', () => {
    it('accepts response without success field', () => {
      const payload = {};

      const result = UploadSamplesToDataStreamResponse.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual({});
    });

    it('accepts response with success true', () => {
      const payload = {
        success: true,
      };

      const result = UploadSamplesToDataStreamResponse.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('accepts response with success false', () => {
      const payload = {
        success: false,
      };

      const result = UploadSamplesToDataStreamResponse.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('rejects non-boolean success', () => {
      const payload = {
        success: 'true',
      };

      const result = UploadSamplesToDataStreamResponse.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('success: Expected boolean');
    });

    it('rejects unknown properties due to strict mode', () => {
      const payload = {
        success: true,
        unknown: 'property',
      };

      const result = UploadSamplesToDataStreamResponse.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('Unrecognized key');
    });

    it('accepts only success field', () => {
      const payload = {
        success: true,
      };

      const result = UploadSamplesToDataStreamResponse.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual({ success: true });
    });
  });
});
