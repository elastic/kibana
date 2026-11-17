/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import { describeResearchSources } from '../dreaming/research';
import type { ResearchStepDependencies } from './helpers';
import { getListResearchSourcesStepDefinition, prepareResearchStep } from './research_steps';
import { createMockStepContext } from './test_utils';

jest.mock('../dreaming/research', () => ({
  describeResearchSources: jest.fn(),
}));

const sources = [
  { type: 'esql' as const, value: 'FROM cases' },
  { type: 'connector' as const, value: 'notion-1' },
];
const aiIndex = {
  id: 'support',
  dest: { type: 'index', value: 'ai-index-idx-support' },
  sources,
};

const createResearchDeps = ({
  available = true,
  canRead = true,
  canWrite = true,
  get = jest.fn().mockResolvedValue(aiIndex),
}: {
  available?: boolean;
  canRead?: boolean;
  canWrite?: boolean;
  get?: jest.Mock;
} = {}) => {
  const actionsClient = { get: jest.fn(), execute: jest.fn() };
  const deps: ResearchStepDependencies = {
    getAiIndexService: () => ({ get } as unknown as AiIndexService),
    isDreamingAvailable: async () => available,
    checkReadPrivilege: async () => canRead,
    checkWritePrivilege: async () => canWrite,
    getActions: async () =>
      ({
        getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClient),
      } as unknown as ActionsPluginStart),
    logger: loggingSystemMock.createLogger(),
  };
  return { deps, actionsClient, get };
};

describe('prepareResearchStep', () => {
  const prepare = (
    options: Parameters<typeof createResearchDeps>[0],
    access: 'read' | 'write' = 'read'
  ) =>
    prepareResearchStep(
      createResearchDeps(options).deps,
      createMockStepContext({ input: {}, esClient: {}, spaceId: 'team-a' }),
      'support',
      access
    );

  it('resolves the AI index in the space of the workflow', async () => {
    await expect(prepare({})).resolves.toEqual(
      expect.objectContaining({ spaceId: 'team-a', aiIndex })
    );
  });

  it('fails while dreaming is unavailable', async () => {
    await expect(prepare({ available: false })).rejects.toThrow(
      'Context Engine dreaming is disabled'
    );
  });

  it('fails without the privilege the step needs', async () => {
    await expect(prepare({ canRead: false })).rejects.toThrow(
      'Insufficient privileges to read AI indices'
    );
    await expect(prepare({ canWrite: false }, 'write')).rejects.toThrow(
      'Insufficient privileges to modify knowledge indicators in AI indices'
    );
    await expect(prepare({ canWrite: false }, 'read')).resolves.toBeDefined();
  });

  it('fails when the AI index does not exist, or cannot be written to', async () => {
    await expect(
      prepare({ get: jest.fn().mockRejectedValue(new AiIndexNotFoundError('support')) })
    ).rejects.toThrow("AI index 'support' not found");
    await expect(
      prepare(
        {
          get: jest
            .fn()
            .mockResolvedValue({ ...aiIndex, dest: { type: 'index', value: 'logs-*' } }),
        },
        'write'
      )
    ).rejects.toThrow('its dest is an index pattern');
  });
});

describe('getListResearchSourcesStepDefinition', () => {
  it('describes the sources of the AI index, and counts those that can be searched', async () => {
    const { deps, actionsClient } = createResearchDeps();
    jest.mocked(describeResearchSources).mockResolvedValue([
      { ref: 'esql:1', type: 'esql', name: 'FROM cases', description: 'd' },
      { ref: 'connector:notion-1', type: 'connector', name: 'n', description: 'd', error: 'no' },
    ]);

    const { output } = await getListResearchSourcesStepDefinition(deps).handler(
      createMockStepContext({ input: { ai_index_id: 'support' }, esClient: {} })
    );

    expect(describeResearchSources).toHaveBeenCalledWith({ sources, actionsClient });
    expect(output).toEqual(expect.objectContaining({ usable: 1 }));
  });
});
