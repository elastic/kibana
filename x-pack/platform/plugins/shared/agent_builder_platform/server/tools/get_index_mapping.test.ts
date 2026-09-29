/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';

vi.mock('@kbn/agent-builder-genai-utils', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/agent-builder-genai-utils')),
    getIndexFields: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

import { getIndexFields } from '@kbn/agent-builder-genai-utils';
import { getIndexMappingsTool } from './get_index_mapping';

const getIndexFieldsMock = getIndexFields as MockedFunction<typeof getIndexFields>;

const runTool = async (indices: string[], raw: boolean) => {
  const result = (await getIndexMappingsTool().handler(
    { indices, raw },
    agentBuilderMocks.tools.createHandlerContext()
  )) as ToolHandlerStandardReturn;

  return result.results.find((entry) => entry.type === ToolResultType.other);
};

describe('getIndexMappingsTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resources without fields', () => {
    beforeEach(() => {
      getIndexFieldsMock.mockResolvedValue({
        'logs-aged-out': { type: 'dataStream', fields: [] },
      });
    });

    it('explains that an empty field list can mean every backing index is on the frozen tier', async () => {
      const result = await runTool(['logs-aged-out'], false);

      expect(result?.data).toMatchObject({
        resources: {
          'logs-aged-out': { fields: expect.stringContaining('frozen tier') },
        },
      });
    });

    it('surfaces the same explanation as a warning in raw mode', async () => {
      const result = await runTool(['logs-aged-out'], true);

      expect(result?.data).toMatchObject({
        resources: {
          'logs-aged-out': { warning: expect.stringContaining('frozen tier') },
        },
      });
    });
  });

  it('does not add a note when the resource has fields', async () => {
    getIndexFieldsMock.mockResolvedValue({
      'logs-hot': {
        type: 'dataStream',
        fields: [{ path: 'message', type: 'text', meta: {} }],
      },
    });

    const result = await runTool(['logs-hot'], false);

    expect(result?.data).toMatchObject({
      resources: {
        'logs-hot': { fields: '- message [text]' },
      },
    });
  });
});
