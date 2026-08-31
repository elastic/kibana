/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import type { ToolResultStore } from '@kbn/agent-builder-server';
import { loggerMock } from '@kbn/logging-mocks';
import { createControlFieldResolver } from './control_field_resolver';

const sampleLogsFieldsText = '- host [text]\n- host.keyword [keyword]';

const createResultStore = ({
  resources,
}: {
  resources?: Record<string, unknown>;
} = {}): Pick<ToolResultStore, 'listEntries' | 'getEntry'> => {
  const dir = '/platform_core_get_index_mapping_call-1';
  return {
    listEntries: jest.fn(async (dirPath: string) => {
      if (resources === undefined || dirPath !== '/') {
        return [];
      }
      return [{ type: 'dir' as const, path: dir }];
    }),
    getEntry: jest.fn(async (path: string) => {
      if (path === `${dir}/meta.json`) {
        return {
          path,
          type: 'file' as const,
          content: {
            raw: {
              tool_id: platformCoreTools.getIndexMapping,
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

describe('createControlFieldResolver', () => {
  it('rewrites a text field using a prior get_index_mapping result', async () => {
    const resolve = createControlFieldResolver({
      resultStore: createResultStore({
        resources: {
          kibana_sample_data_logs: {
            type: 'index',
            fields: sampleLogsFieldsText,
          },
        },
      }),
      logger: loggerMock.create(),
    });

    await expect(resolve({ fieldName: 'host', index: 'kibana_sample_data_logs' })).resolves.toEqual(
      {
        fieldName: 'host.keyword',
      }
    );
  });

  it('rejects an unknown field after looking up the mapping', async () => {
    const resolve = createControlFieldResolver({
      resultStore: createResultStore({
        resources: {
          kibana_sample_data_logs: {
            type: 'index',
            fields: sampleLogsFieldsText,
          },
        },
      }),
      logger: loggerMock.create(),
    });

    await expect(
      resolve({ fieldName: 'method', index: 'kibana_sample_data_logs' })
    ).resolves.toEqual({
      error: 'Field "method" is not an aggregatable field on this index.',
    });
  });

  it('reuses one mapping load for multiple fields on the same index', async () => {
    const resultStore = createResultStore({
      resources: {
        kibana_sample_data_logs: {
          type: 'index',
          fields: sampleLogsFieldsText,
        },
      },
    });
    const resolve = createControlFieldResolver({
      resultStore,
      logger: loggerMock.create(),
    });

    await resolve({ fieldName: 'host', index: 'kibana_sample_data_logs' });
    await resolve({ fieldName: 'method', index: 'kibana_sample_data_logs' });

    expect(resultStore.listEntries).toHaveBeenCalledTimes(1);
  });

  it('passes the field through when no get_index_mapping result covers the index', async () => {
    const resolve = createControlFieldResolver({
      resultStore: createResultStore(),
      logger: loggerMock.create(),
    });

    await expect(resolve({ fieldName: 'host', index: 'missing-*' })).resolves.toEqual({
      fieldName: 'host',
    });
  });
});
