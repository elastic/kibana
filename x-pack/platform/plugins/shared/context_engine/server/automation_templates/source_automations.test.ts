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
  inspectSource,
  createSourceAutomationsChangeHandler,
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
  documents = 500,
  indices = ['orders'],
}: {
  fields?: Record<string, Record<string, { aggregatable: boolean }>>;
  distinct?: number[];
  documents?: number;
  indices?: string[];
} = {}) => {
  const esql = jest.fn(async () => ({
    columns: [
      { name: 'total', type: 'long' },
      ...distinct.map((_, index) => ({ name: `c${index}`, type: 'long' })),
    ],
    values: [[documents, ...distinct]],
  }));
  return {
    esql,
    client: {
      fieldCaps: jest.fn(async () => ({ indices, fields })),
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

describe('sourceAutomationName', () => {
  it('names an automation after what its source reads, unique per query', () => {
    expect(sourceAutomationName(logs.value)).toMatch(
      /^Index metadata: logs-\*, metrics-\* \([0-9a-f]{8}\)$/
    );
    expect(sourceAutomationName('FROM remote:logs-*, orders')).toMatch(
      /^Index metadata: remote:logs-\*, orders \([0-9a-f]{8}\)$/
    );
    expect(sourceAutomationName('FROM orders | LOOKUP JOIN customers ON id')).toMatch(
      /^Index metadata: orders \(/
    );
    expect(sourceAutomationName('FROM orders')).not.toBe(sourceAutomationName(orders.value));
    expect(sourceAutomationName(` ${orders.value} `)).toBe(sourceAutomationName(orders.value));
    expect(sourceAutomationName('ROW a = 1')).toMatch(/^Index metadata: ES\|QL source \(/);
  });
});

describe('inspectSource', () => {
  it('prefers a category-like keyword field with a few values, skipping ids and text', async () => {
    const { client, esql } = esClientWith();

    await expect(inspectSource(client, ['orders'])).resolves.toEqual({
      matched: true,
      documents: 500,
      categoryField: 'status',
    });
    expect(esql).toHaveBeenCalledWith({
      query:
        'FROM "orders" | LIMIT 10000 | STATS total = COUNT(*), c0 = COUNT_DISTINCT(`status`), c1 = COUNT_DISTINCT(`region`)',
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

    await expect(inspectSource(client, ['orders'])).resolves.toEqual(
      expect.objectContaining({ categoryField: 'c' })
    );
  });

  it('finds no category field without a keyword field of few enough values', async () => {
    const textOnly = esClientWith({ fields: { message: { text: { aggregatable: false } } } });
    await expect(inspectSource(textOnly.client, ['orders'])).resolves.toEqual({
      matched: true,
      documents: 500,
      categoryField: undefined,
    });
    await expect(
      inspectSource(esClientWith({ distinct: [1, 5000] }).client, ['orders'])
    ).resolves.toEqual(expect.objectContaining({ matched: true, categoryField: undefined }));
  });

  it('counts the documents, and stops short of querying when no index matches', async () => {
    await expect(inspectSource(esClientWith({ documents: 0 }).client, ['orders'])).resolves.toEqual(
      expect.objectContaining({ matched: true, documents: 0 })
    );

    const none = esClientWith({ indices: [], fields: {} });
    await expect(inspectSource(none.client, ['orders-*'])).resolves.toEqual({
      matched: false,
      documents: 0,
    });
    expect(none.esql).not.toHaveBeenCalled();
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

  const attached = { automations: [{ type: 'workflow' as const, value: 'wf-old' }] };

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
      validateWorkflow: jest.fn(),
    } as unknown as jest.Mocked<AutomationWorkflowsApi>;
    workflows.getWorkflow.mockResolvedValue(installedWorkflow(orders.value));
    workflows.createWorkflow.mockResolvedValue({ id: 'wf-new', valid: true });
    workflows.updateWorkflow.mockResolvedValue({ valid: true });
    workflows.deleteWorkflows.mockResolvedValue({ failures: [] });
    workflows.validateWorkflow.mockResolvedValue({ diagnostics: [] });
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
    await reconcileSourceAutomations(deps(), event(undefined, aiIndex([orders], attached)));

    expect(workflows.updateWorkflow).toHaveBeenCalledWith(
      'wf-old',
      { yaml: expect.stringContaining('automation_name') },
      'default',
      request
    );
    expect(workflows.createWorkflow).not.toHaveBeenCalled();
  });

  it('reports a delete that throws like one that fails', async () => {
    workflows.deleteWorkflows.mockRejectedValue(new Error('workflows unavailable'));

    const warnings = await reconcileSourceAutomations(
      deps(),
      event(aiIndex([orders], attached), aiIndex([]))
    );

    expect(warnings).toEqual([
      {
        source: orders,
        message: expect.stringContaining(
          'was detached but could not be deleted: workflows unavailable'
        ),
      },
    ]);
  });

  it('detaches and deletes the automation of a source taken off', async () => {
    await reconcileSourceAutomations(
      deps(),
      event(aiIndex([orders, logs], attached), aiIndex([logs, drive], attached))
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

    await reconcileSourceAutomations(deps(), event(aiIndex([orders], attached), aiIndex([])));

    expect(aiIndexService.removeAutomation).not.toHaveBeenCalled();
    expect(workflows.deleteWorkflows).not.toHaveBeenCalled();
  });

  it('keeps the workflow, detached, and warns when the saving user cannot delete workflows', async () => {
    canManage.mockResolvedValue(false);

    const warnings = await reconcileSourceAutomations(
      deps(),
      event(aiIndex([orders], attached), aiIndex([]))
    );

    expect(aiIndexService.removeAutomation).toHaveBeenCalled();
    expect(workflows.deleteWorkflows).not.toHaveBeenCalled();
    expect(warnings).toEqual([
      {
        source: orders,
        message: expect.stringContaining("workflow 'wf-old' was kept because you cannot delete"),
      },
    ]);
  });

  it('detaches the workflow before deleting it', async () => {
    const calls: string[] = [];
    aiIndexService.removeAutomation.mockImplementation(async () => calls.push('detach'));
    workflows.deleteWorkflows.mockImplementation(async () => {
      calls.push('delete');
      return { failures: [] };
    });

    const warnings = await reconcileSourceAutomations(
      deps(),
      event(aiIndex([orders], attached), aiIndex([]))
    );

    expect(calls).toEqual(['detach', 'delete']);
    expect(warnings).toEqual([]);
  });

  it('does not delete the workflow when detaching it fails', async () => {
    aiIndexService.removeAutomation.mockRejectedValue(new Error('modified concurrently'));

    const warnings = await reconcileSourceAutomations(
      deps(),
      event(aiIndex([orders], attached), aiIndex([]))
    );

    expect(workflows.deleteWorkflows).not.toHaveBeenCalled();
    expect(warnings).toEqual([
      {
        source: orders,
        message: 'The index metadata automation could not be removed: modified concurrently',
      },
    ]);
  });

  it('finds the workflow of a removed source when the save also dropped the automations', async () => {
    await reconcileSourceAutomations(deps(), event(aiIndex([orders], attached), aiIndex([])));

    expect(workflows.deleteWorkflows).toHaveBeenCalledWith(['wf-old'], 'default', request);
    expect(aiIndexService.removeAutomation).toHaveBeenCalledWith('shop', 'default', {
      type: 'workflow',
      value: 'wf-old',
    });
  });

  it('warns that the workflow was detached but kept when deleting it fails', async () => {
    workflows.deleteWorkflows.mockResolvedValue({
      failures: [{ id: 'wf-old', error: 'managed workflow' }],
    });

    const warnings = await reconcileSourceAutomations(
      deps(),
      event(aiIndex([orders], attached), aiIndex([]))
    );

    expect(warnings).toEqual([
      {
        source: orders,
        message:
          "The index metadata automation could not be removed: workflow 'wf-old' was detached but could not be deleted: managed workflow",
      },
    ]);
    expect(aiIndexService.removeAutomation).toHaveBeenCalledTimes(1);
  });

  it('replaces the automation of a source whose query changed', async () => {
    const edited = { type: 'esql' as const, value: 'FROM orders | WHERE status == "paid"' };
    workflows.getWorkflow
      .mockResolvedValueOnce(installedWorkflow(orders.value))
      .mockResolvedValue(null);

    await reconcileSourceAutomations(
      deps(),
      event(aiIndex([orders], attached), aiIndex([edited], attached))
    );

    expect(workflows.deleteWorkflows).toHaveBeenCalledWith(['wf-old'], 'default', request);
    expect(parse(workflows.createWorkflow.mock.calls[0][0].yaml).name).toBe(
      sourceAutomationName(edited.value)
    );
  });

  it('rolls the workflow back when attaching it fails', async () => {
    workflows.getWorkflow.mockResolvedValue(null);
    aiIndexService.addAutomation.mockRejectedValue(new Error('modified concurrently'));

    const warnings = await reconcileSourceAutomations(deps(), event(undefined, aiIndex([orders])));

    expect(warnings).toEqual([
      {
        source: orders,
        message: 'The index metadata automation could not be installed: modified concurrently',
      },
    ]);
    expect(workflows.deleteWorkflows).toHaveBeenCalledWith(['wf-new'], 'default', request);
  });

  it('keeps a workflow that is created not valid, attached, and warns with why', async () => {
    workflows.getWorkflow.mockResolvedValue(null);
    workflows.createWorkflow.mockResolvedValue({ id: 'wf-new', valid: false });
    workflows.validateWorkflow.mockResolvedValue({
      diagnostics: [
        { severity: 'error', message: 'unknown step type' },
        { severity: 'warning', message: 'unused const' },
      ],
    });

    const warnings = await reconcileSourceAutomations(deps(), event(undefined, aiIndex([orders])));

    expect(warnings).toEqual([
      {
        source: orders,
        message:
          'The automation was saved but is not valid, so it cannot be enabled or run: unknown step type',
      },
    ]);
    expect(aiIndexService.addAutomation).toHaveBeenCalledWith('shop', 'default', {
      type: 'workflow',
      value: 'wf-new',
    });
    expect(workflows.deleteWorkflows).not.toHaveBeenCalled();
  });

  it('warns with why when updating leaves the workflow not valid', async () => {
    workflows.updateWorkflow.mockResolvedValue({ valid: false, validationErrors: ['bad step'] });

    const warnings = await reconcileSourceAutomations(
      deps(),
      event(undefined, aiIndex([orders], attached))
    );

    expect(warnings).toEqual([
      {
        source: orders,
        message:
          'The automation was saved but is not valid, so it cannot be enabled or run: bad step',
      },
    ]);
  });

  it('does not update the workflow of a user who cannot update workflows', async () => {
    canManage.mockImplementation(async (_request, _space, operation) => operation !== 'update');

    const warnings = await reconcileSourceAutomations(
      deps(),
      event(undefined, aiIndex([orders], attached))
    );

    expect(warnings).toEqual([
      { source: orders, message: expect.stringContaining('you cannot update workflows') },
    ]);
    expect(workflows.updateWorkflow).not.toHaveBeenCalled();
  });

  it('warns, and installs nothing, for a user who cannot create workflows', async () => {
    workflows.getWorkflow.mockResolvedValue(null);
    canManage.mockResolvedValue(false);

    const warnings = await reconcileSourceAutomations(deps(), event(undefined, aiIndex([orders])));

    expect(warnings).toEqual([
      {
        source: orders,
        message: expect.stringContaining('you cannot create workflows'),
      },
    ]);
    expect(workflows.createWorkflow).not.toHaveBeenCalled();
  });

  it('installs the automation of an index with no category field, without grouping', async () => {
    workflows.getWorkflow.mockResolvedValue(null);
    esClient = esClientWith({ fields: { message: { text: { aggregatable: false } } } }).client;

    const warnings = await reconcileSourceAutomations(deps(), event(undefined, aiIndex([orders])));

    expect(warnings).toEqual([]);
    expect(parse(workflows.createWorkflow.mock.calls[0][0].yaml).consts.sources).toEqual([
      { index: 'orders', category_field: '' },
    ]);
  });

  it('warns why a source got no automation, rather than installing nothing silently', async () => {
    workflows.getWorkflow.mockResolvedValue(null);
    const remote = { type: 'esql' as const, value: 'FROM remote:orders | LIMIT 10' };
    const row = { type: 'esql' as const, value: 'ROW a = 1' };
    const missing = { type: 'esql' as const, value: 'FROM missing-*' };
    const empty = { type: 'esql' as const, value: 'FROM brand-new' };
    esClient = {
      fieldCaps: jest.fn(async ({ index }: { index: string[] }) =>
        index[0] === 'missing-*' ? { indices: [], fields: {} } : { indices: index, fields: {} }
      ),
      esql: { query: jest.fn(async () => ({ columns: [{ name: 'total' }], values: [[0]] })) },
    } as unknown as ElasticsearchClient;

    const warnings = await reconcileSourceAutomations(
      deps(),
      event(undefined, aiIndex([remote, row, missing, empty]))
    );

    expect(warnings).toEqual([
      { source: remote, message: 'The query reads a remote cluster, which is not profiled.' },
      {
        source: row,
        message: 'The query reads no index with FROM or TS, so there is nothing to profile.',
      },
      {
        source: missing,
        message: 'No index matching missing-* was found, or you do not have read access to it.',
      },
      {
        source: empty,
        message: expect.stringContaining('brand-new has no documents yet'),
      },
    ]);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('reads a remote cluster'));
    expect(workflows.createWorkflow).not.toHaveBeenCalled();
  });

  it('profiles only what a source reads with FROM, not what it joins or enriches', async () => {
    workflows.getWorkflow.mockResolvedValue(null);
    const joined = {
      type: 'esql' as const,
      value: 'FROM orders | LOOKUP JOIN customers ON id | ENRICH region-policy ON region',
    };

    await reconcileSourceAutomations(deps(), event(undefined, aiIndex([joined])));

    expect(parse(workflows.createWorkflow.mock.calls[0][0].yaml).consts.sources).toEqual([
      { index: 'orders', category_field: 'status' },
    ]);
  });

  it('tries every source before reporting the ones that failed', async () => {
    workflows.getWorkflow.mockResolvedValue(null);
    workflows.createWorkflow
      .mockRejectedValueOnce(new Error('invalid yaml'))
      .mockResolvedValue({ id: 'wf-new', valid: true });

    const warnings = await reconcileSourceAutomations(
      deps(),
      event(undefined, aiIndex([orders, logs]))
    );

    expect(warnings).toEqual([
      {
        source: orders,
        message: 'The index metadata automation could not be installed: invalid yaml',
      },
    ]);
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
