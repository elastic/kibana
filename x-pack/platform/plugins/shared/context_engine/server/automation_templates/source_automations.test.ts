/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import type { ElasticsearchClient } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { AiIndexChangeEvent } from '../ai_indices/changes';
import type { AiIndexService } from '../ai_indices/service';
import {
  chooseCategoryField,
  createSourceAutomationsChangeHandler,
  esqlSourceTargets,
  reconcileSourceAutomations,
  sourceAutomationName,
  type AutomationWorkflowsApi,
  type SourceAutomationsDependencies,
} from './source_automations';

const esClientWith = ({
  fields = {
    status: { keyword: { aggregatable: true } },
    'customer.id': { keyword: { aggregatable: true } },
    message: { text: { aggregatable: false } },
    region: { keyword: { aggregatable: true } },
    _index: { _index: { aggregatable: true } },
  },
  distinct = [4, 12],
}: {
  fields?: Record<string, Record<string, { aggregatable: boolean }>>;
  distinct?: number[];
} = {}) => {
  const esql = jest.fn(async () => ({
    columns: distinct.map((_, index) => ({ name: `c${index}`, type: 'long' })),
    values: [distinct],
  }));
  return {
    esql,
    client: {
      fieldCaps: jest.fn(async () => ({ fields })),
      esql: { query: esql },
    } as unknown as ElasticsearchClient,
  };
};

const orders = { type: 'esql' as const, value: 'FROM orders | LIMIT 10' };
const logs = { type: 'esql' as const, value: 'FROM logs-*, metrics-*' };
const drive = { type: 'connector' as const, value: 'drive-1' };

const aiIndex = (
  sources: Array<{ type: 'esql' | 'connector'; value: string }>,
  { managed = false, automations = [] as Array<{ type: 'workflow'; value: string }> } = {}
) => ({
  id: 'shop',
  managed,
  dest: { type: 'index' as const, value: 'ai-index-idx-shop' },
  automations,
  sources,
  traces: [],
  date_created: '2026-11-01T00:00:00.000Z',
  date_modified: '2026-11-01T00:00:00.000Z',
});

describe('esqlSourceTargets and sourceAutomationName', () => {
  it('names an automation after what its source reads, unique per query', () => {
    expect(esqlSourceTargets(logs.value)).toEqual(['logs-*', 'metrics-*']);
    expect(sourceAutomationName(logs.value)).toMatch(
      /^Index metadata: logs-\*, metrics-\* \([0-9a-f]{8}\)$/
    );
    expect(sourceAutomationName('FROM orders')).not.toBe(sourceAutomationName(orders.value));
    expect(sourceAutomationName(` ${orders.value} `)).toBe(sourceAutomationName(orders.value));
    expect(sourceAutomationName('ROW a = 1')).toMatch(/^Index metadata: ES\|QL source \(/);
  });
});

describe('chooseCategoryField', () => {
  it('prefers a category-like keyword field with a few values, skipping ids and text', async () => {
    const { client, esql } = esClientWith();

    await expect(chooseCategoryField(client, ['orders'])).resolves.toBe('status');
    expect(esql).toHaveBeenCalledWith({
      query: 'FROM "orders" | STATS c0 = COUNT_DISTINCT(`status`), c1 = COUNT_DISTINCT(`region`)',
    });
  });

  it('takes the field closest to a handful of values when no name looks like a category', async () => {
    const { client } = esClientWith({
      fields: {
        a: { keyword: { aggregatable: true } },
        b: { keyword: { aggregatable: true } },
        c: { keyword: { aggregatable: true } },
      },
      distinct: [1, 900, 7],
    });

    await expect(chooseCategoryField(client, ['orders'])).resolves.toBe('c');
  });

  it('finds none without a keyword field of few enough values', async () => {
    const textOnly = esClientWith({ fields: { message: { text: { aggregatable: false } } } });
    await expect(chooseCategoryField(textOnly.client, ['orders'])).resolves.toBeUndefined();
    await expect(
      chooseCategoryField(esClientWith({ distinct: [1, 5000] }).client, ['orders'])
    ).resolves.toBeUndefined();
  });
});

describe('reconcileSourceAutomations', () => {
  const request = httpServerMock.createKibanaRequest();
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let esClient: ElasticsearchClient;
  let workflows: jest.Mocked<AutomationWorkflowsApi>;
  let aiIndexService: {
    get: jest.Mock;
    assertCanAcceptAutomation: jest.Mock;
    addAutomation: jest.Mock;
    removeAutomation: jest.Mock;
  };
  let canManage: jest.Mock;

  const deps = (): SourceAutomationsDependencies => ({
    logger,
    getAiIndexService: () => aiIndexService as unknown as AiIndexService,
    getWorkflowsManagement: async () => workflows,
    canManageWorkflows: canManage,
    getScopedEsClient: async () => esClient,
  });

  const event = (
    previous: ReturnType<typeof aiIndex> | undefined,
    current: ReturnType<typeof aiIndex> | undefined
  ) =>
    ({
      aiIndexId: 'shop',
      spaceId: 'default',
      request,
      previous,
      current,
      changed: new Set(['sources']),
    } as unknown as AiIndexChangeEvent);

  const installedWorkflow = (value: string) => ({
    id: 'wf-old',
    name: sourceAutomationName(value),
    tags: ['index-metadata', 'ce-template:index_metadata'],
  });

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    esClient = esClientWith().client;
    workflows = {
      getWorkflow: jest.fn(),
      createWorkflow: jest.fn(),
      updateWorkflow: jest.fn(),
      deleteWorkflows: jest.fn(),
    } as unknown as jest.Mocked<AutomationWorkflowsApi>;
    workflows.getWorkflow.mockResolvedValue(installedWorkflow(orders.value));
    workflows.createWorkflow.mockResolvedValue({ id: 'wf-new', valid: true });
    workflows.updateWorkflow.mockResolvedValue({ valid: true });
    workflows.deleteWorkflows.mockResolvedValue({});
    aiIndexService = {
      get: jest.fn(async () =>
        aiIndex([], { automations: [{ type: 'workflow', value: 'wf-old' }] })
      ),
      assertCanAcceptAutomation: jest.fn(),
      addAutomation: jest.fn(async () => 'attached'),
      removeAutomation: jest.fn(async () => 'removed'),
    };
    canManage = jest.fn(async () => true);
  });

  it('installs the index metadata template for each ES|QL source added, as the saving user', async () => {
    workflows.getWorkflow.mockResolvedValue(null);

    await reconcileSourceAutomations(deps(), event(undefined, aiIndex([orders, logs, drive])));

    expect(workflows.createWorkflow).toHaveBeenCalledTimes(2);
    const [[{ yaml }, spaceId, onBehalfOf]] = workflows.createWorkflow.mock.calls;
    expect([spaceId, onBehalfOf]).toEqual(['default', request]);
    const workflow = parse(yaml);
    expect(workflow.name).toBe(sourceAutomationName(orders.value));
    expect(workflow.tags).toContain('ce-template:index_metadata');
    expect(workflow.consts).toEqual(
      expect.objectContaining({
        ai_index_id: 'shop',
        automation_name: sourceAutomationName(orders.value),
        sources: [{ index: 'orders', category_field: 'status' }],
      })
    );
    expect(parse(workflows.createWorkflow.mock.calls[1][0].yaml).consts.sources).toEqual([
      { index: 'logs-*,metrics-*', category_field: 'status' },
    ]);
    expect(aiIndexService.addAutomation).toHaveBeenCalledWith('shop', 'default', {
      type: 'workflow',
      value: 'wf-new',
    });
  });

  it('updates the automation a source already has instead of installing another', async () => {
    await reconcileSourceAutomations(deps(), event(undefined, aiIndex([orders])));

    expect(workflows.updateWorkflow).toHaveBeenCalledWith(
      'wf-old',
      { yaml: expect.stringContaining('automation_name') },
      'default',
      request
    );
    expect(workflows.createWorkflow).not.toHaveBeenCalled();
  });

  it('detaches and deletes the automation of a source taken off', async () => {
    await reconcileSourceAutomations(
      deps(),
      event(aiIndex([orders, logs]), aiIndex([logs, drive]))
    );

    expect(aiIndexService.removeAutomation).toHaveBeenCalledWith('shop', 'default', {
      type: 'workflow',
      value: 'wf-old',
    });
    expect(workflows.deleteWorkflows).toHaveBeenCalledWith(['wf-old'], 'default', request);
    expect(workflows.createWorkflow).not.toHaveBeenCalled();
  });

  it('leaves a workflow it did not install, or that another template installed, alone', async () => {
    workflows.getWorkflow.mockResolvedValue({
      ...installedWorkflow(orders.value),
      tags: ['ce-template:unit_profile'],
    });

    await reconcileSourceAutomations(deps(), event(aiIndex([orders]), aiIndex([])));

    expect(aiIndexService.removeAutomation).not.toHaveBeenCalled();
    expect(workflows.deleteWorkflows).not.toHaveBeenCalled();
  });

  it('keeps the workflow, detached, when the saving user cannot delete workflows', async () => {
    canManage.mockResolvedValue(false);

    await reconcileSourceAutomations(deps(), event(aiIndex([orders]), aiIndex([])));

    expect(aiIndexService.removeAutomation).toHaveBeenCalled();
    expect(workflows.deleteWorkflows).not.toHaveBeenCalled();
  });

  it('replaces the automation of a source whose query changed', async () => {
    const edited = { type: 'esql' as const, value: 'FROM orders | WHERE status == "paid"' };
    workflows.getWorkflow
      .mockResolvedValueOnce(installedWorkflow(orders.value))
      .mockResolvedValue(null);

    await reconcileSourceAutomations(deps(), event(aiIndex([orders]), aiIndex([edited])));

    expect(workflows.deleteWorkflows).toHaveBeenCalledWith(['wf-old'], 'default', request);
    expect(parse(workflows.createWorkflow.mock.calls[0][0].yaml).name).toBe(
      sourceAutomationName(edited.value)
    );
  });

  it('rolls the workflow back when attaching it fails', async () => {
    workflows.getWorkflow.mockResolvedValue(null);
    aiIndexService.addAutomation.mockRejectedValue(new Error('modified concurrently'));

    await expect(
      reconcileSourceAutomations(deps(), event(undefined, aiIndex([orders])))
    ).rejects.toThrow('modified concurrently');
    expect(workflows.deleteWorkflows).toHaveBeenCalledWith(['wf-new'], 'default', request);
  });

  it('installs nothing for a user who cannot create workflows, or with no category field', async () => {
    workflows.getWorkflow.mockResolvedValue(null);
    canManage.mockResolvedValue(false);
    await expect(
      reconcileSourceAutomations(deps(), event(undefined, aiIndex([orders])))
    ).rejects.toThrow('cannot create workflows');

    canManage.mockResolvedValue(true);
    esClient = esClientWith({ distinct: [1, 1] }).client;
    await reconcileSourceAutomations(deps(), event(undefined, aiIndex([orders])));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('has no keyword field'));
    expect(workflows.createWorkflow).not.toHaveBeenCalled();
  });

  it('tries every source before reporting the ones that failed', async () => {
    workflows.getWorkflow.mockResolvedValue(null);
    workflows.createWorkflow
      .mockRejectedValueOnce(new Error('invalid yaml'))
      .mockResolvedValue({ id: 'wf-new', valid: true });

    await expect(
      reconcileSourceAutomations(deps(), event(undefined, aiIndex([orders, logs])))
    ).rejects.toThrow(`installing "${sourceAutomationName(orders.value)}": invalid yaml`);
    expect(workflows.createWorkflow).toHaveBeenCalledTimes(2);
  });

  it('skips managed and deleted AI indices, and runs without workflows management', async () => {
    await reconcileSourceAutomations(
      deps(),
      event(undefined, aiIndex([orders], { managed: true }))
    );
    await reconcileSourceAutomations(deps(), event(aiIndex([orders]), undefined));
    await reconcileSourceAutomations(
      { ...deps(), getWorkflowsManagement: async () => undefined },
      event(undefined, aiIndex([orders]))
    );

    expect(workflows.createWorkflow).not.toHaveBeenCalled();
    expect(workflows.getWorkflow).not.toHaveBeenCalled();
  });

  it('runs on changes to sources', () => {
    expect(createSourceAutomationsChangeHandler(deps())).toEqual(
      expect.objectContaining({ id: 'index_metadata_source_automations', fields: ['sources'] })
    );
  });
});
