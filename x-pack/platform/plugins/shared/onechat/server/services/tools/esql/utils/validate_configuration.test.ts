/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESQLQueryVariables } from '@kbn/esql-utils';
import { validateConfig } from './validate_configuration';
import { validateQuery } from '@kbn/esql-validation-autocomplete';
import { createBadRequestError, EsqlToolFieldTypes } from '@kbn/onechat-common';

jest.mock('@kbn/esql-validation-autocomplete', () => ({
    validateQuery: jest.fn(),
  }));
  
  jest.mock('@kbn/esql-utils', () => ({
    getESQLQueryVariables: jest.fn(),
  }));
  
  jest.mock('@kbn/onechat-common', () => ({
    createBadRequestError: jest.fn(),

  }));

const mockValidateQuery = validateQuery as jest.MockedFunction<typeof validateQuery>;
const mockGetESQLQueryVariables = getESQLQueryVariables as jest.MockedFunction<typeof getESQLQueryVariables>;
const mockCreateBadRequestError = createBadRequestError as jest.MockedFunction<typeof createBadRequestError>;

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
              case_id: { type: 'keyword' as EsqlToolFieldTypes, description: 'Case ID' }
            }
          };
    
        mockGetESQLQueryVariables.mockReturnValue(['case_id']);
        await expect(validateConfig(config)).resolves.toBeUndefined();
      
        expect(mockValidateQuery).toHaveBeenCalledWith(config.query, {"ignoreOnMissingCallbacks": true});
        expect(mockGetESQLQueryVariables).toHaveBeenCalledWith(config.query);
    });

    it('should pass validation with no parameters', async () => {
      const config = {
        query: 'FROM my_cases | LIMIT 10',
        params: {}
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
        params: {}
      };

      const syntaxErrors = 
        [
            {
              text: "SyntaxError: mismatched input 'WHERE' expecting {'row', 'from', 'show'}",
              code: '400',
              type: 'error' as const,
              location: { min: 1, max: 6 }
            }
        ]
      mockValidateQuery.mockResolvedValue({ errors: syntaxErrors, warnings: [] });
      mockGetESQLQueryVariables.mockReturnValue(['case_id']);
      mockCreateBadRequestError.mockImplementation((message: string) => {
        const error = new Error(message);
        error.name = 'OnechatBadRequestError';
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
          case_id: { type: 'keyword' as EsqlToolFieldTypes, description: 'Case ID' }
        }
      };

      mockValidateQuery.mockResolvedValue({ errors: [], warnings: [] });
      mockGetESQLQueryVariables.mockReturnValue(['case_id', 'owner']);
      mockCreateBadRequestError.mockImplementation((message: string) => {
        const error = new Error(message);
        error.name = 'OnechatBadRequestError';
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
        params: {}
      };
      
      mockValidateQuery.mockResolvedValue({ errors: [], warnings: []});
      mockGetESQLQueryVariables.mockReturnValue(['case_id']);
      mockCreateBadRequestError.mockImplementation((message: string) => {
        const error = new Error(message);
        error.name = 'OnechatBadRequestError';
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
          case_id: { type: 'keyword' as EsqlToolFieldTypes, description: 'Case ID' },
          owner: { type: 'keyword' as EsqlToolFieldTypes, description: 'Owner' },
        }
      };

      mockValidateQuery.mockResolvedValue({ errors: [], warnings: [] });
      mockGetESQLQueryVariables.mockReturnValue(['case_id']);
      mockCreateBadRequestError.mockImplementation((message: string) => {
        const error = new Error(message);
        error.name = 'OnechatBadRequestError';
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
          case_id: { type: 'keyword' as EsqlToolFieldTypes, description: 'Case Id' }
        }
      };

      mockValidateQuery.mockResolvedValue({ errors: [], warnings: [] });
      mockGetESQLQueryVariables.mockReturnValue([]);
      mockCreateBadRequestError.mockImplementation((message: string) => {
        const error = new Error(message);
        error.name = 'OnechatBadRequestError';
        return error as any;
      });

      await expect(validateConfig(config)).rejects.toThrow();
      
      expect(mockCreateBadRequestError).toHaveBeenCalledWith(
        'Defined parameters not used in query: case_id\nQuery parameters: none'
      );
    });
  });
});