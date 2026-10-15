/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexSearchToolDefinition } from '@kbn/agent-builder-common/tools';
import { ToolType } from '@kbn/agent-builder-common';
import {
  transformFormDataToIndexSearchTool,
  transformIndexSearchToolToFormData,
} from './transform_index_search_form_data';
import type { IndexSearchToolFormData } from '../components/tools/form/types/tool_form_types';

describe('transformIndexSearchFormData', () => {
  let mockFormData: IndexSearchToolFormData;
  let mockTool: IndexSearchToolDefinition;

  beforeEach(() => {
    mockFormData = {
      toolId: 'threat-hunt-search',
      description: 'Searches security logs.',
      pattern: 'logs-*',
      rowLimit: 50,
      customInstructions: 'Prefer recent events.',
      includeFrozen: true,
      labels: ['security'],
      type: ToolType.index_search,
    };

    mockTool = {
      id: 'threat-hunt-search',
      description: 'Searches security logs.',
      readonly: false,
      experimental: false,
      configuration: {
        pattern: 'logs-*',
        row_limit: 50,
        custom_instructions: 'Prefer recent events.',
        include_frozen: true,
      },
      type: ToolType.index_search,
      tags: ['security'],
    };
  });

  it('transforms an index search tool to form data', () => {
    expect(transformIndexSearchToolToFormData(mockTool)).toEqual(mockFormData);
  });

  it('transforms form data to an index search tool', () => {
    expect(transformFormDataToIndexSearchTool(mockFormData)).toEqual(mockTool);
  });

  it('defaults includeFrozen to false when the tool does not set it', () => {
    const { include_frozen: _, ...configuration } = mockTool.configuration;

    const result = transformIndexSearchToolToFormData({ ...mockTool, configuration });

    expect(result.includeFrozen).toBe(false);
  });
});
