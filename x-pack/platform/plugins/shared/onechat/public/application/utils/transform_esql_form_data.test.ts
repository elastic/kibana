/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { EsqlToolDefinition } from '@kbn/onechat-common';
import { ToolType } from '@kbn/onechat-common';
import type { CreateToolPayload } from '../../../common/http_api/tools';
import {
  transformEsqlFormDataForCreate,
  transformEsqlFormDataForUpdate,
  transformEsqlToolToFormData,
  transformFormDataToEsqlTool,
} from './transform_esql_form_data';
import {
  EsqlParamSource,
  type EsqlToolFormData,
} from '../components/tools/form/types/tool_form_types';

describe('transformEsqlFormData', () => {
  let mockFormData: EsqlToolFormData;
  let mockTool: EsqlToolDefinition;

  beforeEach(() => {
    mockFormData = {
      toolId: 'my-test-tool',
      description: 'A tool for testing.',
      esql: 'FROM my_index | LIMIT 10 | WHERE field1 == ?param1 AND field2 == ?param2',
      params: [
        {
          name: 'param1',
          type: 'text',
          description: 'A string parameter.',
          source: EsqlParamSource.Custom,
        },
        {
          name: 'param2',
          type: 'long',
          description: 'A number parameter.',
          source: EsqlParamSource.Custom,
        },
      ],
      labels: ['test', 'esql'],
      type: ToolType.esql,
    };

    mockTool = {
      id: 'my-test-tool',
      description: 'A tool for testing.',
      readonly: false,
      configuration: {
        query: 'FROM my_index | LIMIT 10 | WHERE field1 == ?param1 AND field2 == ?param2',
        params: {
          param1: {
            type: 'text',
            description: 'A string parameter.',
          },
          param2: {
            type: 'long',
            description: 'A number parameter.',
          },
        },
      },
      type: ToolType.esql,
      tags: ['test', 'esql'],
    };
  });

  describe('transformEsqlToolToFormData', () => {
    it('should transform an ES|QL tool to form data', () => {
      const result = transformEsqlToolToFormData(mockTool);
      expect(result).toEqual(mockFormData);
    });
  });

  describe('transformFormDataToEsqlTool', () => {
    it('should transform form data to an ES|QL tool', () => {
      const result = transformFormDataToEsqlTool(mockFormData);
      expect(result).toEqual(mockTool);
    });

    it('should filter out unused params', () => {
      mockFormData.esql = 'FROM my_index | LIMIT 10 | WHERE field1 == ?param1';
      mockFormData.params.push({
        name: 'unusedParam',
        description: 'An unused parameter.',
        type: 'text',
        source: EsqlParamSource.Custom,
      });

      const expectedTool = { ...mockTool };
      expectedTool.configuration.query = 'FROM my_index | LIMIT 10 | WHERE field1 == ?param1';
      expectedTool.configuration.params = {
        param1: {
          description: 'A string parameter.',
          type: 'text',
        },
      };

      const result = transformFormDataToEsqlTool(mockFormData);

      expect(result).toEqual(expectedTool);
    });
  });

  describe('transformEsqlFormDataForCreate', () => {
    it('should transform ES|QL form data to a create tool payload', () => {
      const expectedPayload: CreateToolPayload = omit(mockTool, ['readonly']);

      const result = transformEsqlFormDataForCreate(mockFormData);
      expect(result).toEqual(expectedPayload);
    });

    it('should handle empty params and tags', () => {
      const formData: EsqlToolFormData = {
        toolId: 'simple-test-tool',
        description: 'A simple tool with no params or tags.',
        esql: 'FROM other_index',
        params: [],
        labels: [],
        type: ToolType.esql,
      };

      const expectedPayload: CreateToolPayload = {
        id: 'simple-test-tool',
        description: 'A simple tool with no params or tags.',
        configuration: {
          query: 'FROM other_index',
          params: {},
        },
        type: ToolType.esql,
        tags: [],
      };

      const result = transformEsqlFormDataForCreate(formData);
      expect(result).toEqual(expectedPayload);
    });

    it('should filter out params that are not used in the ES|QL query', () => {
      const formData: EsqlToolFormData = {
        toolId: 'my-test-tool',
        description: 'A tool for testing.',
        esql: 'FROM my_index | LIMIT 10 | WHERE field1 == ?param1',
        params: [
          {
            name: 'param1',
            type: 'text',
            description: 'A string parameter.',
            source: EsqlParamSource.Custom,
          },
          {
            name: 'param2',
            type: 'long',
            description: 'A number parameter.',
            source: EsqlParamSource.Custom,
          },
        ],
        labels: ['test', 'esql'],
        type: ToolType.esql,
      };

      const expectedPayload: CreateToolPayload = {
        id: 'my-test-tool',
        description: 'A tool for testing.',
        configuration: {
          query: 'FROM my_index | LIMIT 10 | WHERE field1 == ?param1',
          params: {
            param1: {
              type: 'text',
              description: 'A string parameter.',
            },
          },
        },
        type: ToolType.esql,
        tags: ['test', 'esql'],
      };

      const result = transformEsqlFormDataForCreate(formData);
      expect(result).toEqual(expectedPayload);
    });
  });
  describe('transformEsqlFormDataForUpdate', () => {
    it('should transform ES|QL form data to an update tool payload', () => {
      const toolWithoutIdAndType = omit(mockTool, ['id', 'type', 'readonly']);

      const result = transformEsqlFormDataForUpdate(mockFormData);
      expect(result).toEqual(toolWithoutIdAndType);
    });
  });
});
