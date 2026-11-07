/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { CaseStatuses } from '../../common/types/domain';
import {
  CASE_CONFIGURE_SAVED_OBJECT,
  CASE_TASK_TEMPLATE_SAVED_OBJECT,
  CASE_TEMPLATE_SAVED_OBJECT,
} from '../../common/constants';
import type { SystemTemplateDefinition } from '.';
import { SystemTemplateRegistry, ensureSystemTemplates, isSystemTemplateId } from '.';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const definition: SystemTemplateDefinition = {
  id: 'ai-investigation',
  name: 'AI investigation',
  description: 'Cases opened from AlertZero investigations.',
  taskList: {
    id: 'ai-investigation-review',
    name: 'AI investigation review',
    description: 'Check what the agent found, then record the outcome.',
    tasks: [
      { title: 'Verify the AI verdict', required: false },
      { title: 'Record the outcome', required: true },
    ],
  },
  statuses: [
    {
      key: 'awaiting_analyst',
      label: 'Awaiting analyst',
      category: CaseStatuses.open,
      pausesTimeTracking: true,
    },
  ],
};

const registry = () => {
  const r = new SystemTemplateRegistry();
  r.register('securitySolution', definition);
  return r;
};

const setup = ({
  taskListExists = false,
  templateTotal = 0,
  configuration,
}: {
  taskListExists?: boolean;
  templateTotal?: number;
  configuration?: { statuses?: unknown[]; pauseReasons?: string[] };
}) => {
  const repository = savedObjectsRepositoryMock.create();
  repository.get.mockImplementation(async (type, id) => {
    if (type === CASE_TASK_TEMPLATE_SAVED_OBJECT && taskListExists) {
      return { id, type, attributes: {}, references: [] };
    }
    throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
  });
  repository.find.mockImplementation(async ({ type }) => {
    if (type === CASE_TEMPLATE_SAVED_OBJECT) {
      return { saved_objects: [], total: templateTotal, page: 1, per_page: 0 };
    }
    return {
      saved_objects: configuration
        ? [
            {
              id: 'configure-1',
              type: CASE_CONFIGURE_SAVED_OBJECT,
              version: 'WzEsMV0=',
              attributes: configuration,
              references: [],
              score: 1,
            },
          ]
        : [],
      total: configuration ? 1 : 0,
      page: 1,
      per_page: 1,
    };
  }) as typeof repository.find;
  return repository;
};

const run = (repository: ReturnType<typeof setup>, customStatusesEnabled = true) =>
  ensureSystemTemplates({
    repository,
    spaceId: 'default',
    templates: registry().list(),
    customStatusesEnabled,
    logger: loggingSystemMock.createLogger(),
    now: () => '2026-11-06T00:00:00.000Z',
  });

describe('ensureSystemTemplates', () => {
  it('writes the task list, the template, and the status when they are missing', async () => {
    const repository = setup({ configuration: { statuses: [], pauseReasons: [] } });

    const result = await run(repository);

    expect(result).toEqual({
      createdTaskLists: [expect.stringMatching(UUID)],
      createdTemplates: ['system-ai-investigation'],
      addedStatuses: ['awaiting_analyst'],
      ownersWithoutConfiguration: [],
    });
    const [taskListCall, templateCall] = repository.create.mock.calls;
    expect(taskListCall[0]).toBe(CASE_TASK_TEMPLATE_SAVED_OBJECT);
    expect(taskListCall[1]).toMatchObject({
      name: 'AI investigation review',
      owner: 'securitySolution',
      tasks: [
        { title: 'Verify the AI verdict', required: false },
        { title: 'Record the outcome', required: true },
      ],
    });
    expect(templateCall[0]).toBe(CASE_TEMPLATE_SAVED_OBJECT);
    expect(templateCall[1]).toMatchObject({
      templateId: 'system-ai-investigation',
      name: 'AI investigation',
      isEnabled: true,
      isLatest: true,
    });
    // The template points at this space's task list; ids are unique per space because these
    // saved objects are multiple-isolated.
    expect(String((templateCall[1] as { definition: string }).definition)).toContain(
      result.createdTaskLists[0]
    );
    expect(templateCall[2]).toMatchObject({ id: expect.stringMatching(UUID) });

    const [, , configurationUpdate] = repository.update.mock.calls[0];
    const statuses = (configurationUpdate as { statuses: Array<{ key: string }> }).statuses;
    // The built-in statuses are kept and the new one is appended after them.
    expect(statuses.map(({ key }) => key)).toEqual([
      'open',
      'in-progress',
      'closed',
      'awaiting_analyst',
    ]);
    expect(statuses[3]).toMatchObject({ pausesTimeTracking: true, isDefault: false });
    expect(configurationUpdate).toHaveProperty('pauseReasons');
  });

  it('leaves an existing template alone, so one someone turned off stays off', async () => {
    const repository = setup({
      taskListExists: true,
      templateTotal: 2,
      configuration: {
        statuses: [
          {
            key: 'awaiting_analyst',
            label: 'Waiting on us',
            category: 'open',
            order: 3,
            isDefault: false,
            disabled: true,
          },
        ],
      },
    });

    const result = await run(repository);

    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
    expect(result.addedStatuses).toEqual([]);
  });

  it('adds the status once, and never creates a configuration', async () => {
    const withoutConfiguration = setup({});
    const result = await run(withoutConfiguration);
    expect(result.ownersWithoutConfiguration).toEqual(['securitySolution']);
    expect(withoutConfiguration.update).not.toHaveBeenCalled();
    expect(withoutConfiguration.create).toHaveBeenCalledTimes(2);

    const flagOff = setup({ configuration: { statuses: [] } });
    await run(flagOff, false);
    expect(flagOff.update).not.toHaveBeenCalled();
  });
});

describe('ensureSystemTemplates, more', () => {
  it('treats a conflict on create as already there (another writer won the race)', async () => {
    const repository = setup({ configuration: { statuses: [] } });
    repository.create.mockRejectedValue(
      SavedObjectsErrorHelpers.createConflictError(CASE_TASK_TEMPLATE_SAVED_OBJECT, 'x')
    );

    const result = await run(repository);

    expect(result.createdTaskLists).toEqual([]);
    expect(result.createdTemplates).toEqual([]);
  });

  it('leaves the statuses alone when the requester cannot change Cases settings', async () => {
    const repository = setup({ configuration: { statuses: [] } });

    const result = await ensureSystemTemplates({
      repository,
      spaceId: 'default',
      templates: registry().list(),
      customStatusesEnabled: true,
      addStatuses: false,
      logger: loggingSystemMock.createLogger(),
    });

    expect(result.createdTemplates).toEqual(['system-ai-investigation']);
    expect(repository.update).not.toHaveBeenCalled();
  });
});

describe('SystemTemplateRegistry', () => {
  it('gives each space its own saved-object ids', async () => {
    const first = setup({});
    const second = setup({});
    await run(first);
    await ensureSystemTemplates({
      repository: second,
      spaceId: 'other-space',
      templates: registry().list(),
      customStatusesEnabled: true,
      logger: loggingSystemMock.createLogger(),
    });
    expect(first.create.mock.calls[0][2]?.id).not.toEqual(second.create.mock.calls[0][2]?.id);
  });

  it('refuses the same template twice for an owner', () => {
    const r = registry();
    expect(() => r.register('securitySolution', definition)).toThrow(/already registered/);
    expect(r.list('observability')).toEqual([]);
  });

  it('recognizes shipped template ids', () => {
    expect(isSystemTemplateId('system-ai-investigation')).toBe(true);
    expect(isSystemTemplateId('9a7c0b2e')).toBe(false);
  });
});
