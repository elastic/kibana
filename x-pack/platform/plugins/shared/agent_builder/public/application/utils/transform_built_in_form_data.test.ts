/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolDefinitionWithSchema } from '@kbn/agent-builder-common';
import { ToolType } from '@kbn/agent-builder-common';
import { transformBuiltInToolToFormData } from './transform_built_in_form_data';
import type { BuiltinToolFormData } from '../components/tools/form/types/tool_form_types';

describe('transformBuiltInFormData', () => {
  let mockTool: ToolDefinitionWithSchema;
  let mockFormData: BuiltinToolFormData;

  beforeEach(() => {
    mockTool = {
      id: '.search',
      type: ToolType.builtin,
      description:
        'A powerful tool for searching and analyzing data within a specific Elasticsearch index.',
      tags: ['retrieval', 'search'],
      configuration: {},
      schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'A natural language query expressing the search request',
          },
          index: {
            type: 'string',
            description: 'Index to search against',
          },
        },
        required: ['query'],
      },
      readonly: true,
    };

    mockFormData = {
      toolId: '.search',
      description:
        'A powerful tool for searching and analyzing data within a specific Elasticsearch index.',
      labels: ['retrieval', 'search'],
      type: ToolType.builtin,
    };
  });

  describe('transformBuiltInToolToFormData', () => {
    it('should transform a built-in tool to form data', () => {
      const result = transformBuiltInToolToFormData(mockTool);
      expect(result).toEqual(mockFormData);
    });

    it('should handle tools with empty tags array', () => {
      const toolWithEmptyTags: ToolDefinitionWithSchema = {
        ...mockTool,
        tags: [],
      };

      const expectedFormData = {
        ...mockFormData,
        labels: [],
      };

      const result = transformBuiltInToolToFormData(toolWithEmptyTags);
      expect(result).toEqual(expectedFormData);
    });

    it('should preserve the built-in tool ID format', () => {
      const toolWithDifferentId: ToolDefinitionWithSchema = {
        ...mockTool,
        id: '.execute_esql',
      };

      const result = transformBuiltInToolToFormData(toolWithDifferentId);
      expect(result.toolId).toBe('.execute_esql');
      expect(result.type).toBe(ToolType.builtin);
    });
  });
});
