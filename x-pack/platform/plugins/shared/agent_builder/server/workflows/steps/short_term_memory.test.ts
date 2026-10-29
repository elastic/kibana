/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { ShortTermMemorySystemClient } from '@kbn/agent-builder-server';
import { createStepHandlerContext } from '../../test_utils/workflow_steps';
import {
  consolidateShortTermMemoriesStepDefinition,
  decayShortTermMemoriesStepDefinition,
  listShortTermMemoriesByOwnerStepDefinition,
  listShortTermMemoriesStepDefinition,
  setShortTermMemoryPromotionStepDefinition,
  type ShortTermMemoryStepDeps,
} from './short_term_memory';

const createSystemClient = (): jest.Mocked<ShortTermMemorySystemClient> => ({
  listForPromotion: jest.fn(),
  setPromotion: jest.fn(),
  listByOwner: jest.fn().mockResolvedValue([]),
  consolidate: jest.fn().mockResolvedValue({ merged: 0, deleted: 0, skipped: 0 }),
  decay: jest.fn().mockResolvedValue({ expired: 0, unused: 0 }),
});

const contextFor = (input: unknown): StepHandlerContext =>
  createStepHandlerContext({
    input,
    overrides: {
      contextManager: {
        getFakeRequest: jest.fn(),
        getScopedEsClient: jest.fn(),
        getContext: jest.fn().mockReturnValue({
          workflow: { id: 'wf-1', spaceId: 'space-1' },
          execution: { id: 'run-1' },
        }),
      } as unknown as StepHandlerContext['contextManager'],
    },
  });

describe('short-term memory maintenance steps', () => {
  it.each([
    [
      'list_by_owner',
      (deps: ShortTermMemoryStepDeps) =>
        listShortTermMemoriesByOwnerStepDefinition(deps).handler(contextFor({})),
    ],
    [
      'consolidate',
      (deps: ShortTermMemoryStepDeps) =>
        consolidateShortTermMemoriesStepDefinition(deps).handler(
          contextFor({ user_id: 'u', agent_id: 'a' })
        ),
    ],
    [
      'decay',
      (deps: ShortTermMemoryStepDeps) =>
        decayShortTermMemoriesStepDefinition(deps).handler(contextFor({ unused_days: 14 })),
    ],
  ])('%s refuses a workflow that does not run as an administrator', async (_, run) => {
    const systemClient = createSystemClient();

    const result = await run({
      getSystemClient: () => systemClient,
      isAdmin: async () => false,
    });

    expect(result).toEqual({ error: expect.objectContaining({ type: 'PermissionError' }) });
    expect(systemClient.listByOwner).not.toHaveBeenCalled();
    expect(systemClient.consolidate).not.toHaveBeenCalled();
    expect(systemClient.decay).not.toHaveBeenCalled();
  });

  it('lists owners in the workflow space', async () => {
    const systemClient = createSystemClient();
    const step = listShortTermMemoriesByOwnerStepDefinition({
      getSystemClient: () => systemClient,
      isAdmin: async () => true,
    });

    await step.handler(
      contextFor({ agent_ids: ['agent-1'], changed_within_hours: 48, max_owners: 5 })
    );

    expect(systemClient.listByOwner).toHaveBeenCalledWith({
      spaceId: 'space-1',
      agentIds: ['agent-1'],
      changedWithinHours: 48,
      maxOwners: 5,
      maxMemoriesPerOwner: undefined,
    });
  });

  it('consolidates as the workflow, defaulting missing plans to empty lists', async () => {
    const systemClient = createSystemClient();
    const step = consolidateShortTermMemoriesStepDefinition({
      getSystemClient: () => systemClient,
      isAdmin: async () => true,
    });

    const result = await step.handler(contextFor({ user_id: 'u_alice_0', agent_id: 'agent-1' }));

    expect(systemClient.consolidate).toHaveBeenCalledWith({
      spaceId: 'space-1',
      userId: 'u_alice_0',
      agentId: 'agent-1',
      merges: [],
      remove: [],
      writer: { uri: 'workflow://wf-1', metadata: { run_id: 'run-1', space_id: 'space-1' } },
    });
    expect(result).toEqual({ output: { merged: 0, deleted: 0, skipped: 0 } });
  });

  it('decays in the workflow space', async () => {
    const systemClient = createSystemClient();
    const step = decayShortTermMemoriesStepDefinition({
      getSystemClient: () => systemClient,
      isAdmin: async () => true,
    });

    await step.handler(contextFor({ unused_days: 14 }));

    expect(systemClient.decay).toHaveBeenCalledWith({
      spaceId: 'space-1',
      agentIds: undefined,
      unusedDays: 14,
    });
  });

  it('lists and decides memories as this workflow, so other workflows still see them', async () => {
    const systemClient = createSystemClient();
    systemClient.listForPromotion.mockResolvedValue([]);
    systemClient.setPromotion.mockResolvedValue({ updated: 1 });
    const deps = { getSystemClient: () => systemClient, isAdmin: async () => true };

    await listShortTermMemoriesStepDefinition(deps).handler(contextFor({ limit: 10 }));
    await setShortTermMemoryPromotionStepDefinition(deps).handler(
      contextFor({ ids: ['memory-1'], status: 'rejected', reason: 'personal' })
    );

    expect(systemClient.listForPromotion).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'space-1', decider: 'wf-1', limit: 10 })
    );
    expect(systemClient.setPromotion).toHaveBeenCalledWith({
      spaceId: 'space-1',
      ids: ['memory-1'],
      decider: 'wf-1',
      promotion: { status: 'rejected', reason: 'personal' },
    });
  });
});
