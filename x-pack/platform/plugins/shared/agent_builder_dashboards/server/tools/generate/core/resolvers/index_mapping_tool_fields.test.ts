/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import type { ToolResultStore } from '@kbn/agent-builder-server';
import {
  loadIndexMappingFieldsFromResultStore,
  parseIndexMappingFields,
} from './index_mapping_tool_fields';

describe('parseIndexMappingFields', () => {
  it('parses the default formatted field list from get_index_mapping', () => {
    expect(
      parseIndexMappingFields({
        resources: {
          kibana_sample_data_logs: {
            type: 'index',
            fields: [
              '- host [text]',
              '- host.keyword [keyword]',
              '- clientip [ip]',
              '- bytes [long] transferred bytes',
              '- metrics.cpu [double, ts_metric=gauge]',
            ].join('\n'),
          },
        },
      })
    ).toEqual({
      kibana_sample_data_logs: {
        host: 'text',
        'host.keyword': 'keyword',
        clientip: 'ip',
        bytes: 'long',
        'metrics.cpu': 'double',
      },
    });
  });

  it('parses a flat field array when the mapping was truncated', () => {
    expect(
      parseIndexMappingFields({
        resources: {
          'logs-*': {
            type: 'indexPattern',
            fields: [
              { path: 'service.name', type: 'keyword' },
              { path: 'host.name', type: 'keyword' },
            ],
          },
        },
      })
    ).toEqual({
      'logs-*': {
        'service.name': 'keyword',
        'host.name': 'keyword',
      },
    });
  });

  it('returns an empty object when the payload is not a mapping result', () => {
    expect(parseIndexMappingFields({ message: 'nope' })).toEqual({});
    expect(parseIndexMappingFields(undefined)).toEqual({});
  });
});

describe('loadIndexMappingFieldsFromResultStore', () => {
  const createResultStore = ({
    toolId = platformCoreTools.getIndexMapping,
    resources,
  }: {
    toolId?: string;
    resources: Record<string, unknown>;
  }): Pick<ToolResultStore, 'listEntries' | 'getEntry'> => {
    const dir = '/platform_core_get_index_mapping_call-1';
    return {
      listEntries: jest.fn(async (dirPath: string) => {
        if (dirPath === '/') {
          return [{ type: 'dir' as const, path: dir }];
        }
        return [];
      }),
      getEntry: jest.fn(async (path: string) => {
        if (path === `${dir}/meta.json`) {
          return {
            path,
            type: 'file' as const,
            content: {
              raw: {
                tool_id: toolId,
                results: [{ file: 'result.json' }],
              },
            },
            metadata: {} as never,
          };
        }
        if (path === `${dir}/result.json`) {
          return {
            path,
            type: 'file' as const,
            content: { raw: { resources } },
            metadata: {} as never,
          };
        }
        return undefined;
      }),
    };
  };

  it('loads field types from a prior get_index_mapping tool call', async () => {
    const resultStore = createResultStore({
      resources: {
        kibana_sample_data_logs: {
          type: 'index',
          fields: '- host [text]\n- host.keyword [keyword]',
        },
      },
    });

    await expect(loadIndexMappingFieldsFromResultStore(resultStore)).resolves.toEqual(
      new Map([['kibana_sample_data_logs', { host: 'text', 'host.keyword': 'keyword' }]])
    );
  });

  it('ignores tool calls that are not get_index_mapping', async () => {
    const resultStore = createResultStore({
      toolId: platformCoreTools.listIndices,
      resources: {
        kibana_sample_data_logs: {
          type: 'index',
          fields: '- host [text]',
        },
      },
    });

    await expect(loadIndexMappingFieldsFromResultStore(resultStore)).resolves.toEqual(new Map());
  });
});
