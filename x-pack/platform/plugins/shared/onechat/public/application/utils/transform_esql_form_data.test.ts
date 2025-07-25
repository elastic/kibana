/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/onechat-common';
import { CreateToolPayload } from '../../../common/http_api/tools';
import { transformEsqlFormData } from './transform_esql_form_data';
import { OnechatEsqlToolFormData } from '../components/tools/esql/form/types/esql_tool_form_types';

describe('transformEsqlFormData', () => {
  it('should transform ES|QL form data to a create tool payload', () => {
    const formData: OnechatEsqlToolFormData = {
      name: 'my-test-tool',
      description: 'A tool for testing.',
      esql: 'FROM my_index | LIMIT 10 | WHERE field1 == ?param1 AND field2 == ?param2',
      params: [
        { name: 'param1', type: 'text', description: 'A string parameter.' },
        { name: 'param2', type: 'long', description: 'A number parameter.' },
      ],
      tags: ['test', 'esql'],
    };

    const expectedPayload: CreateToolPayload = {
      id: 'my-test-tool',
      description: 'A tool for testing.',
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

    const result = transformEsqlFormData(formData);
    expect(result).toEqual(expectedPayload);
  });

  it('should handle empty params and tags', () => {
    const formData: OnechatEsqlToolFormData = {
      name: 'simple-test-tool',
      description: 'A simple tool with no params or tags.',
      esql: 'FROM other_index',
      params: [],
      tags: [],
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

    const result = transformEsqlFormData(formData);
    expect(result).toEqual(expectedPayload);
  });

  it('should filter out params that are not used in the ES|QL query', () => {
    const formData: OnechatEsqlToolFormData = {
      name: 'my-test-tool',
      description: 'A tool for testing.',
      esql: 'FROM my_index | LIMIT 10 | WHERE field1 == ?param1',
      params: [
        { name: 'param1', type: 'text', description: 'A string parameter.' },
        { name: 'param2', type: 'long', description: 'A number parameter.' },
      ],
      tags: ['test', 'esql'],
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

    const result = transformEsqlFormData(formData);
    expect(result).toEqual(expectedPayload);
  });
});
