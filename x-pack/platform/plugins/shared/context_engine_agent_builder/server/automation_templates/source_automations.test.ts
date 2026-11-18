/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { AiIndexChangeEvent } from '@kbn/context-engine-plugin/server';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import {
  findInstalledTemplateWorkflowIdByName,
  installAutomationTemplate,
} from './install_automation_template';
import {
  chooseCategoryField,
  createSourceAutomationsChangeHandler,
  esqlSourceTargets,
  reconcileSourceAutomations,
  sourceAutomationName,
  type SourceAutomationsDependencies,
} from './source_automations';

jest.mock('./install_automation_template', () => ({
  findInstalledTemplateWorkflowIdByName: jest.fn(),
  installAutomationTemplate: jest.fn(),
}));

const fieldCaps = (fields: Record<string, Record<string, { aggregatable: boolean }>>) => ({
  fields,
});

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
      fieldCaps: jest.fn(async () => fieldCaps(fields)),
      esql: { query: esql },
    } as unknown as ElasticsearchClient,
  };
};

const aiIndex = (sources: Array<{ type: string; value: string }>, managed = false) => ({
  id: 'shop',
  managed,
  dest: { type: 'index', value: 'ai-index-idx-shop' },
  automations: [],
  sources,
  traces: [],
  date_created: '2026-11-01T00:00:00.000Z',
  date_modified: '2026-11-01T00:00:00.000Z',
});

const orders = { type: 'esql', value: 'FROM orders | LIMIT 10' };
const logs = { type: 'esql', value: 'FROM logs-*, metrics-*' };
const drive = { type: 'connector', value: 'drive-1' };

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
    await expect(
      chooseCategoryField(
        esClientWith({ fields: { message: { text: { aggregatable: false } } } }).client,
        ['orders']
      )
    ).resolves.toBeUndefined();
    await expect(
      chooseCategoryField(esClientWith({ distinct: [1, 5000] }).client, ['orders'])
    ).resolves.toBeUndefined();
  });
});

describe('reconcileSourceAutomations', () => {
  const request = httpServerMock.createKibanaRequest();
  const removeAutomation = jest.fn();
  const deleteWorkflows = jest.fn();
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let esClient: ElasticsearchClient;

  const deps = (): SourceAutomationsDependencies => ({
    logger,
    getAiIndexService: async () => ({ removeAutomation } as unknown as AiIndexService),
    getCoreStart: jest.fn(),
    getSecurityStart: jest.fn(),
    getWorkflowsManagement: () => ({ deleteWorkflows } as never),
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

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
    esClient = esClientWith().client;
    jest.mocked(installAutomationTemplate).mockResolvedValue({
      aiIndexId: 'shop',
      workflowId: 'wf-new',
      status: 'saved_and_attached',
      replaced: false,
    });
    jest.mocked(findInstalledTemplateWorkflowIdByName).mockResolvedValue('wf-old');
  });

  it('installs the index metadata template for each ES|QL source of a new AI index', async () => {
    await reconcileSourceAutomations(deps(), event(undefined, aiIndex([orders, logs, drive])));

    expect(installAutomationTemplate).toHaveBeenCalledTimes(2);
    expect(installAutomationTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        aiIndexId: 'shop',
        spaceId: 'default',
        request,
        params: {
          template: 'index_metadata',
          name: sourceAutomationName(orders.value),
          sources: [{ index: 'orders', categoryField: 'status' }],
        },
      })
    );
    expect(installAutomationTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          sources: [{ index: 'logs-*,metrics-*', categoryField: 'status' }],
        }),
      })
    );
  });

  it("removes and deletes the automation of a source taken off, installing only the new one's", async () => {
    await reconcileSourceAutomations(
      deps(),
      event(aiIndex([orders, logs]), aiIndex([logs, drive]))
    );

    expect(findInstalledTemplateWorkflowIdByName).toHaveBeenCalledWith(
      expect.objectContaining({
        template: 'index_metadata',
        name: sourceAutomationName(orders.value),
      })
    );
    expect(removeAutomation).toHaveBeenCalledWith('shop', 'default', {
      type: 'workflow',
      value: 'wf-old',
    });
    expect(deleteWorkflows).toHaveBeenCalledWith(['wf-old'], 'default', request);
    expect(installAutomationTemplate).not.toHaveBeenCalled();
  });

  it('replaces the automation of a source whose query changed', async () => {
    const edited = { type: 'esql', value: 'FROM orders | WHERE status == "paid"' };

    await reconcileSourceAutomations(deps(), event(aiIndex([orders]), aiIndex([edited])));

    expect(deleteWorkflows).toHaveBeenCalledWith(['wf-old'], 'default', request);
    expect(installAutomationTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ name: sourceAutomationName(edited.value) }),
      })
    );
  });

  it('leaves a source alone when no automation was installed for it', async () => {
    jest.mocked(findInstalledTemplateWorkflowIdByName).mockResolvedValue(undefined);

    await reconcileSourceAutomations(deps(), event(aiIndex([orders]), aiIndex([])));

    expect(removeAutomation).not.toHaveBeenCalled();
    expect(deleteWorkflows).not.toHaveBeenCalled();
  });

  it('skips managed and deleted AI indices', async () => {
    await reconcileSourceAutomations(deps(), event(undefined, aiIndex([orders], true)));
    await reconcileSourceAutomations(deps(), event(aiIndex([orders]), undefined));

    expect(installAutomationTemplate).not.toHaveBeenCalled();
    expect(findInstalledTemplateWorkflowIdByName).not.toHaveBeenCalled();
  });

  it('skips a source with no category field, and reports a failure after trying the rest', async () => {
    esClient = esClientWith({ distinct: [1, 1] }).client;
    await reconcileSourceAutomations(deps(), event(undefined, aiIndex([orders])));
    expect(installAutomationTemplate).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('has no keyword field'));

    esClient = esClientWith().client;
    jest.mocked(installAutomationTemplate).mockRejectedValueOnce(new Error('no workflow access'));
    await expect(
      reconcileSourceAutomations(deps(), event(undefined, aiIndex([orders, logs])))
    ).rejects.toThrow(`installing "${sourceAutomationName(orders.value)}": no workflow access`);
    expect(installAutomationTemplate).toHaveBeenCalledTimes(2);
  });

  it('runs on changes to sources', () => {
    expect(createSourceAutomationsChangeHandler(deps())).toEqual(
      expect.objectContaining({ id: 'index_metadata_source_automations', fields: ['sources'] })
    );
  });
});
