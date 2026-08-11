/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESQLQueryVariables } from '@kbn/esql-utils';
import { validateConfig } from './validate_configuration';
import { validateQuery } from '@kbn/esql-language';
import type { EsqlToolFieldTypes } from '@kbn/agent-builder-common';
import { createBadRequestError } from '@kbn/agent-builder-common';
import { configurationSchema, configurationUpdateSchema } from './schemas';

jest.mock('@kbn/esql-language', () => ({
  validateQuery: jest.fn(),
}));

jest.mock('@kbn/esql-utils', () => ({
  getESQLQueryVariables: jest.fn(),
}));

jest.mock('@kbn/agent-builder-common', () => ({
  createBadRequestError: jest.fn(),
}));

const mockValidateQuery = validateQuery as jest.MockedFunction<typeof validateQuery>;
const mockGetESQLQueryVariables = getESQLQueryVariables as jest.MockedFunction<
  typeof getESQLQueryVariables
>;
const mockCreateBadRequestError = createBadRequestError as jest.MockedFunction<
  typeof createBadRequestError
>;

describe('validateConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockValidateQuery.mockResolvedValue({ errors: [], warnings: [] });
    mockGetESQLQueryVariables.mockReturnValue([]);
    mockCreateBadRequestError.mockImplementation((message: string) => ({ message } as any));
  });

  describe('successful validation', () => {
    it('should pass validation with valid query and matching parameters', async () => {
      const config = {
        query: 'FROM my_cases | WHERE case_id == ?case_id',
        params: {
          case_id: { type: 'string' as EsqlToolFieldTypes, description: 'Case ID' },
        },
      };

      mockGetESQLQueryVariables.mockReturnValue(['case_id']);
      await expect(validateConfig(config)).resolves.toBeUndefined();

      expect(mockValidateQuery).toHaveBeenCalledWith(config.query);
      expect(mockGetESQLQueryVariables).toHaveBeenCalledWith(config.query);
    });

    it('should pass validation with no parameters', async () => {
      const config = {
        query: 'FROM my_cases | LIMIT 10',
        params: {},
      };

      mockValidateQuery.mockResolvedValue({ errors: [], warnings: [] });
      mockGetESQLQueryVariables.mockReturnValue([]);

      await expect(validateConfig(config)).resolves.toBeUndefined();
    });
  });

  describe('query syntax validation errors', () => {
    it('should throw error when query has syntax errors', async () => {
      const config = {
        query: 'WHERE case_id == ?case_id',
        params: {},
      };

      const syntaxErrors = [
        {
          text: "SyntaxError: mismatched input 'WHERE' expecting {'row', 'from', 'show'}",
          code: '400',
          type: 'error' as const,
          location: { min: 1, max: 6 },
        },
      ];
      mockValidateQuery.mockResolvedValue({ errors: syntaxErrors, warnings: [] });
      mockGetESQLQueryVariables.mockReturnValue(['case_id']);
      mockCreateBadRequestError.mockImplementation((message: string) => {
        const error = new Error(message);
        error.name = 'AgentBuilderBadRequestError';
        return error as any;
      });

      await expect(validateConfig(config)).rejects.toThrow();

      expect(mockCreateBadRequestError).toHaveBeenCalledWith(
        "Validation error: \nSyntaxError: mismatched input 'WHERE' expecting {'row', 'from', 'show'}"
      );
    });
  });

  describe('parameter validation errors', () => {
    it('should throw error when query uses undefined parameters', async () => {
      const config = {
        query: 'FROM my_cases | WHERE case_id == ?case_id AND owner == ?owner',
        params: {
          case_id: { type: 'string' as EsqlToolFieldTypes, description: 'Case ID' },
        },
      };

      mockValidateQuery.mockResolvedValue({ errors: [], warnings: [] });
      mockGetESQLQueryVariables.mockReturnValue(['case_id', 'owner']);
      mockCreateBadRequestError.mockImplementation((message: string) => {
        const error = new Error(message);
        error.name = 'AgentBuilderBadRequestError';
        return error as any;
      });

      await expect(validateConfig(config)).rejects.toThrow();

      expect(mockCreateBadRequestError).toHaveBeenCalledWith(
        'Query uses undefined parameters: owner\nAvailable parameters: case_id'
      );
    });

    it('should throw error when multiple parameters are undefined', async () => {
      const config = {
        query: 'FROM my_cases | WHERE case_id == ?case_id',
        params: {},
      };

      mockValidateQuery.mockResolvedValue({ errors: [], warnings: [] });
      mockGetESQLQueryVariables.mockReturnValue(['case_id']);
      mockCreateBadRequestError.mockImplementation((message: string) => {
        const error = new Error(message);
        error.name = 'AgentBuilderBadRequestError';
        return error as any;
      });

      await expect(validateConfig(config)).rejects.toThrow();

      expect(mockCreateBadRequestError).toHaveBeenCalledWith(
        'Query uses undefined parameters: case_id\nAvailable parameters: none'
      );
    });

    it('should throw error when defined parameters are not used in query', async () => {
      const config = {
        query: 'FROM my_cases | WHERE case_id == ?case_id',
        params: {
          case_id: { type: 'string' as EsqlToolFieldTypes, description: 'Case ID' },
          owner: { type: 'string' as EsqlToolFieldTypes, description: 'Owner' },
        },
      };

      mockValidateQuery.mockResolvedValue({ errors: [], warnings: [] });
      mockGetESQLQueryVariables.mockReturnValue(['case_id']);
      mockCreateBadRequestError.mockImplementation((message: string) => {
        const error = new Error(message);
        error.name = 'AgentBuilderBadRequestError';
        return error as any;
      });

      await expect(validateConfig(config)).rejects.toThrow();

      expect(mockCreateBadRequestError).toHaveBeenCalledWith(
        'Defined parameters not used in query: owner\nQuery parameters: case_id'
      );
    });

    it('should handle case when no parameters are used in query', async () => {
      const config = {
        query: 'FROM my_cases | LIMIT 1',
        params: {
          case_id: { type: 'string' as EsqlToolFieldTypes, description: 'Case Id' },
        },
      };

      mockValidateQuery.mockResolvedValue({ errors: [], warnings: [] });
      mockGetESQLQueryVariables.mockReturnValue([]);
      mockCreateBadRequestError.mockImplementation((message: string) => {
        const error = new Error(message);
        error.name = 'AgentBuilderBadRequestError';
        return error as any;
      });

      await expect(validateConfig(config)).rejects.toThrow();

      expect(mockCreateBadRequestError).toHaveBeenCalledWith(
        'Defined parameters not used in query: case_id\nQuery parameters: none'
      );
    });
  });

  describe('defaultValue type validation', () => {
    beforeEach(() => {
      mockValidateQuery.mockResolvedValue({ errors: [], warnings: [] });
      mockGetESQLQueryVariables.mockReturnValue(['param1']);
      mockCreateBadRequestError.mockImplementation((message: string) => {
        const error = new Error(message);
        error.name = 'AgentBuilderBadRequestError';
        return error as any;
      });
    });

    const createConfig = (type: EsqlToolFieldTypes, defaultValue: unknown) => ({
      query: 'FROM my_cases | WHERE field == ?param1',
      params: {
        param1: {
          type,
          description: 'Test param',
          optional: true,
          defaultValue,
        },
      },
    });

    describe('valid defaultValue types', () => {
      const validCases = [
        { type: 'string' as const, value: 'hello' },
        { type: 'integer' as const, value: 123 },
        { type: 'float' as const, value: 2.5 },
        { type: 'boolean' as const, value: true },
        { type: 'date' as const, value: '2023-01-01T00:00:00Z' },
      ];

      it.each(validCases)(
        'should pass validation for $type with $value',
        async ({ type, value }) => {
          const config = createConfig(type, value);
          await expect(validateConfig(config as any)).resolves.toBeUndefined();
        }
      );
    });

    describe('invalid defaultValue types', () => {
      const invalidCases = [
        { type: 'string' as const, value: 123, expectedError: 'not a string' },
        { type: 'integer' as const, value: 'not a number', expectedError: 'not an integer' },
        { type: 'boolean' as const, value: 'true', expectedError: 'not a boolean' },
        { type: 'integer' as const, value: 3.14, expectedError: 'not an integer' },
        { type: 'float' as const, value: 'not a number', expectedError: 'not a number' },
        { type: 'date' as const, value: 123, expectedError: 'not a string' },
      ];

      it.each(invalidCases)(
        'should throw error for $type with $value',
        async ({ type, value, expectedError }) => {
          const config = createConfig(type, value);
          await expect(validateConfig(config as any)).rejects.toThrow();
          expect(mockCreateBadRequestError).toHaveBeenCalledWith(
            `Parameter 'param1' has type '${type}' but defaultValue is ${expectedError}`
          );
        }
      );
    });

    describe('edge cases', () => {
      it('should pass validation when parameter has no defaultValue', async () => {
        const config = {
          query: 'FROM my_cases | WHERE name == ?param1',
          params: {
            param1: {
              type: 'string' as EsqlToolFieldTypes,
              description: 'Name',
              optional: true,
            },
          },
        };
        await expect(validateConfig(config as any)).resolves.toBeUndefined();
      });

      it('should pass validation when parameter has undefined defaultValue', async () => {
        const config = createConfig('string', undefined);
        await expect(validateConfig(config as any)).resolves.toBeUndefined();
      });
    });
  });

  describe('schema validation rejects legacy param types', () => {
    it('should reject object param type on create', () => {
      expect(() =>
        configurationSchema.validate({
          query: 'FROM my_cases | WHERE field == ?param1',
          params: { param1: { type: 'object', description: 'x' } },
        })
      ).toThrow();
    });

    it('should reject nested param type on update', () => {
      expect(() =>
        configurationUpdateSchema.validate({
          params: { param1: { type: 'nested', description: 'x' } },
        })
      ).toThrow();
    });
  });

  describe('schema validation for defaultValue', () => {
    it('should reject defaultValue when optional is false', () => {
      expect(() =>
        configurationSchema.validate({
          query: 'FROM my_cases | WHERE field == ?param1',
          params: {
            param1: { type: 'string', description: 'x', optional: false, defaultValue: 'y' },
          },
        })
      ).toThrow();
    });

    it('should reject defaultValue when optional is not set', () => {
      expect(() =>
        configurationSchema.validate({
          query: 'FROM my_cases | WHERE field == ?param1',
          params: { param1: { type: 'string', description: 'x', defaultValue: 'y' } },
        })
      ).toThrow();
    });
  });
});
