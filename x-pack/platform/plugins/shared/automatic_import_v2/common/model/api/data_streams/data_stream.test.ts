/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';

import {
  CreateAutoImportDataStreamRequestParams,
  CreateAutoImportDataStreamRequestBody,
  CreateAutoImportDataStreamResponse,
  UpdateAutoImportDataStreamRequestParams,
  UpdateAutoImportDataStreamRequestBody,
} from './data_stream.gen';

describe('data stream schemas', () => {
  describe('CreateAutoImportDataStreamRequestParams', () => {
    it('accepts valid params', () => {
      const payload = {
        integration_id: 'integration-123',
      };

      const result = CreateAutoImportDataStreamRequestParams.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('requires integration_id', () => {
      const result = CreateAutoImportDataStreamRequestParams.safeParse({});
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('integration_id: Required');
    });

    it('rejects empty integration_id', () => {
      const payload = {
        integration_id: '   ',
      };

      const result = CreateAutoImportDataStreamRequestParams.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('integration_id: No empty strings allowed');
    });
  });

  describe('CreateAutoImportDataStreamRequestBody', () => {
    it('accepts a valid payload with all fields', () => {
      const payload = {
        title: 'data-stream-title',
        description: 'Data stream description',
        samples: ['sample1', 'sample2', 'sample3'],
      };

      const result = CreateAutoImportDataStreamRequestBody.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('accepts a minimal payload with only required fields', () => {
      const payload = {
        title: 'data-stream-title',
        samples: ['sample1', 'sample2', 'sample3'],
      };

      const result = CreateAutoImportDataStreamRequestBody.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('rejects unknown properties', () => {
      const payload = {
        title: 'data-stream-title',
        unknown: 'should be stripped',
      };

      const result = CreateAutoImportDataStreamRequestBody.safeParse(payload);
      expectParseError(result);
    });

    it('requires a title', () => {
      const result = CreateAutoImportDataStreamRequestBody.safeParse({});
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('title: Required');
    });

    it('rejects an empty title', () => {
      const payload = {
        title: '   ',
      };

      const result = CreateAutoImportDataStreamRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('title: No empty strings allowed');
    });

    it('accepts empty samples array', () => {
      const payload = {
        title: 'data-stream-title',
        samples: [],
      };

      const result = CreateAutoImportDataStreamRequestBody.safeParse(payload);
      expectParseError(result);
    });

    it('rejects non-string samples', () => {
      const payload = {
        title: 'data-stream-title',
        samples: [123, 456],
      };

      const result = CreateAutoImportDataStreamRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain(
        'samples.0: Expected string, received number'
      );
    });
  });

  describe('CreateAutoImportDataStreamResponse', () => {
    it('requires data_stream_id', () => {
      const result = CreateAutoImportDataStreamResponse.safeParse({});
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('data_stream_id: Required');
    });

    it('accepts a valid response', () => {
      const payload = {
        data_stream_id: 'data-stream-id-123',
      };

      const result = CreateAutoImportDataStreamResponse.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('rejects empty data_stream_id', () => {
      const payload = {
        data_stream_id: '   ',
      };

      const result = CreateAutoImportDataStreamResponse.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('data_stream_id: No empty strings allowed');
    });
  });

  describe('UpdateAutoImportDataStreamRequestParams', () => {
    it('accepts valid params', () => {
      const payload = {
        integration_id: 'integration-123',
        data_stream_id: 'data-stream-456',
      };

      const result = UpdateAutoImportDataStreamRequestParams.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('requires both integration_id and data_stream_id', () => {
      const result = UpdateAutoImportDataStreamRequestParams.safeParse({});
      expectParseError(result);

      const errorString = stringifyZodError(result.error);
      expect(errorString).toContain('integration_id: Required');
      expect(errorString).toContain('data_stream_id: Required');
    });

    it('rejects empty integration_id', () => {
      const payload = {
        integration_id: '   ',
        data_stream_id: 'data-stream-456',
      };

      const result = UpdateAutoImportDataStreamRequestParams.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('integration_id: No empty strings allowed');
    });

    it('rejects empty data_stream_id', () => {
      const payload = {
        integration_id: 'integration-123',
        data_stream_id: '   ',
      };

      const result = UpdateAutoImportDataStreamRequestParams.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('data_stream_id: No empty strings allowed');
    });
  });

  describe('UpdateAutoImportDataStreamRequestBody', () => {
    it('accepts an empty payload', () => {
      const result = UpdateAutoImportDataStreamRequestBody.safeParse({});
      expectParseSuccess(result);

      expect(result.data).toEqual({});
    });

    it('accepts partial updates with description only', () => {
      const payload = {
        description: 'updated description',
      };

      const result = UpdateAutoImportDataStreamRequestBody.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('accepts partial updates with samples only', () => {
      const payload = {
        samples: ['new-sample-1', 'new-sample-2'],
      };

      const result = UpdateAutoImportDataStreamRequestBody.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('accepts partial updates with both description and samples', () => {
      const payload = {
        description: 'updated description',
        samples: ['new-sample-1', 'new-sample-2'],
      };

      const result = UpdateAutoImportDataStreamRequestBody.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('rejects title updates', () => {
      const payload = {
        title: 'new title',
      };

      const result = UpdateAutoImportDataStreamRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain("Unrecognized key(s) in object: 'title'");
    });

    it('rejects unknown properties', () => {
      const payload = {
        description: 'updated description',
        unexpected: 'value',
      };

      const result = UpdateAutoImportDataStreamRequestBody.safeParse(payload);
      expectParseError(result);
    });

    it('rejects non-string samples', () => {
      const payload = {
        samples: [123, 456],
      };

      const result = UpdateAutoImportDataStreamRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain(
        'samples.0: Expected string, received number'
      );
    });
  });
});
