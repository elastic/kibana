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
  UpdateAutoImportIntegrationRequestBody,
  UpdateAutoImportIntegrationRequestParams,
} from './integration.gen';

describe('integration schemas', () => {
  describe('CreateAutoImportIntegrationRequestBody', () => {
    it('accepts a valid payload', () => {
      const payload = {
        title: 'integration-title',
        description: 'Integration description',
        logo: 'data:image/png;base64,abc123',
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('rejects unknown properties', () => {
      const payload = {
        title: 'integration-title',
        unknown: 'should be stripped',
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);
    });

    it('requires a title', () => {
      const result = CreateAutoImportIntegrationRequestBody.safeParse({});
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain('title: Required');
    });

    it('rejects an empty title', () => {
      const payload = {
        title: '   ',
      };

      const result = CreateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('title: No empty strings allowed');
    });
  });

  describe('CreateAutoImportIntegrationResponse', () => {
    it('requires integration_id', () => {
      const result = CreateAutoImportIntegrationResponse.safeParse({});
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('integration_id: Required');
    });

    it('accepts a valid response', () => {
      const payload = {
        integration_id: 'integration-id',
      };

      const result = CreateAutoImportIntegrationResponse.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
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
        integration_id: 'integration-id',
      };

      const result = UpdateAutoImportIntegrationRequestParams.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });
  });

  describe('UpdateAutoImportIntegrationRequestBody', () => {
    it('accepts an empty payload', () => {
      const result = UpdateAutoImportIntegrationRequestBody.safeParse({});
      expectParseSuccess(result);

      expect(result.data).toEqual({});
    });

    it('accepts partial updates', () => {
      const payload = {
        description: 'updated description',
      };

      const result = UpdateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseSuccess(result);

      expect(result.data).toEqual(payload);
    });

    it('rejects title updates', () => {
      const payload = {
        title: 'new title',
      };

      const result = UpdateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain("Unrecognized key(s) in object: 'title'");
    });

    it('strips unknown properties', () => {
      const payload = {
        description: 'updated description',
        unexpected: 'value',
      };

      const result = UpdateAutoImportIntegrationRequestBody.safeParse(payload);
      expectParseError(result);
    });
  });
});
