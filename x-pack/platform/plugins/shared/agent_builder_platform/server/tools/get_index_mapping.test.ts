/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  ...jest.requireActual('@kbn/agent-builder-genai-utils'),
  getIndexFields: jest.fn(),
}));

import { getIndexFields } from '@kbn/agent-builder-genai-utils';
import { getIndexMappingsTool } from './get_index_mapping';
import { resolveToolSchema } from './test_utils';

const getIndexFieldsMock = getIndexFields as jest.MockedFunction<typeof getIndexFields>;

const runTool = async (
  indices: string[],
  raw: boolean,
  includeFrozen?: boolean,
  includeFrozenByDefault = false
) => {
  const tool = getIndexMappingsTool();
  const schema = await resolveToolSchema(tool, includeFrozenByDefault);
  const result = (await tool.handler(
    schema.parse({ indices, raw, include_frozen: includeFrozen }),
    agentBuilderMocks.tools.createHandlerContext()
  )) as ToolHandlerStandardReturn;

  return result.results.find((entry) => entry.type === ToolResultType.other);
};

describe('getIndexMappingsTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    it('suggests opting in to the frozen tier', async () => {
      const result = await runTool(['logs-aged-out'], false);

      expect(result?.data).toMatchObject({
        resources: {
          'logs-aged-out': { fields: expect.stringContaining('include_frozen') },
        },
      });
    });

    it('omits the frozen tier explanation when frozen tier indices were included', async () => {
      const result = await runTool(['logs-aged-out'], true, true);

      expect(result?.data).toMatchObject({
        resources: {
          'logs-aged-out': { warning: 'No fields found.' },
        },
      });
    });
  });

  describe('include_frozen', () => {
    beforeEach(() => {
      getIndexFieldsMock.mockResolvedValue({});
    });

    it('excludes frozen tier indices by default', async () => {
      await runTool(['logs-*'], false);

      expect(getIndexFieldsMock).toHaveBeenCalledWith(
        expect.objectContaining({ includeFrozen: false })
      );
    });

    it('includes frozen tier indices when opted in', async () => {
      await runTool(['logs-*'], false, true);

      expect(getIndexFieldsMock).toHaveBeenCalledWith(
        expect.objectContaining({ includeFrozen: true })
      );
    });

    it('includes frozen tier indices by default when the space setting is enabled', async () => {
      await runTool(['logs-*'], false, undefined, true);

      expect(getIndexFieldsMock).toHaveBeenCalledWith(
        expect.objectContaining({ includeFrozen: true })
      );
    });

    it('lets the agent override the default', async () => {
      await runTool(['logs-*'], false, false, true);

      expect(getIndexFieldsMock).toHaveBeenCalledWith(
        expect.objectContaining({ includeFrozen: false })
      );
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
