/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  CONTEXT_ENGINE_ONTOLOGY_CONNECTOR_WORKFLOW_ID,
  CONTEXT_ENGINE_ONTOLOGY_ESQL_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { AiIndexItem } from '../../common/http_api/ai_indices';
import type { AiIndexService } from '../ai_indices/service';
import type { DreamingWorkflowsApi } from '../dreaming/schedule';
import { removeOntologySource } from './apply';
import { ontologySourceId } from './ids';
import { createOntologyChangeHandler } from './change_handler';
import {
  createOntologyScheduleService,
  ontologyWorkflowIdFor,
  ontologyWorkflowIdSuffixFor,
} from './schedule';

jest.mock('./apply', () => ({
  removeOntologySource: jest.fn(async () => ({ created: 0, updated: 0, deleted: 0, rejected: [] })),
}));

const SPACE = 'marketing';
const suffix = `support-${createHash('sha256').update(SPACE).digest('hex').slice(0, 16)}`;
const esql = { type: 'esql' as const, value: 'FROM orders' };
const drive = { type: 'connector' as const, value: 'drive-1' };

const aiIndex = (overrides: Partial<AiIndexItem> = {}): AiIndexItem => ({
  id: 'support',
  managed: false,
  dest: { type: 'index', value: 'ai-index-idx-support' },
  automations: [],
  sources: [esql, drive],
  traces: [],
  date_created: '2026-11-01T00:00:00.000Z',
  date_modified: '2026-11-01T00:00:00.000Z',
  dreaming: {
    enabled: true,
    entities: { nodes: [{ type: 'customer' }] },
    ontology: { enabled: true },
  },
  ...overrides,
});

describe('createOntologyScheduleService', () => {
  let client: jest.Mocked<Pick<PluginScopedManagedWorkflowsApi, 'install' | 'uninstall'>>;
  let workflowsManagement: {
    updateWorkflow: jest.Mock;
    cancelAllActiveWorkflowExecutions: jest.Mock;
  };
  let aiIndexService: jest.Mocked<Pick<AiIndexService, 'addAutomation' | 'removeAutomation'>>;
  let request: KibanaRequest;

  const createService = () =>
    createOntologyScheduleService({
      logger: loggingSystemMock.createLogger(),
      getManagedWorkflowsClient: async () => client as unknown as PluginScopedManagedWorkflowsApi,
      getWorkflowsManagement: async () =>
        workflowsManagement as unknown as DreamingWorkflowsApi | undefined,
      getAiIndexService: () => aiIndexService as unknown as AiIndexService,
      getScopedEsClient: async () => ({} as ElasticsearchClient),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    client = {
      install: jest.fn().mockResolvedValue(undefined),
      uninstall: jest.fn().mockResolvedValue(undefined),
    };
    workflowsManagement = {
      updateWorkflow: jest.fn().mockResolvedValue(undefined),
      cancelAllActiveWorkflowExecutions: jest.fn().mockResolvedValue(undefined),
    };
    aiIndexService = {
      addAutomation: jest.fn().mockResolvedValue('attached'),
      removeAutomation: jest.fn().mockResolvedValue('removed'),
    };
    request = httpServerMock.createKibanaRequest();
  });

  it('names one workflow per source of the AI index, by its definition', () => {
    expect(ontologyWorkflowIdFor('support', SPACE, esql)).toBe(
      `${CONTEXT_ENGINE_ONTOLOGY_ESQL_WORKFLOW_ID}-${suffix}-${ontologySourceId(esql)}`
    );
    expect(ontologyWorkflowIdFor('support', SPACE, drive)).toBe(
      `${CONTEXT_ENGINE_ONTOLOGY_CONNECTOR_WORKFLOW_ID}-${suffix}-${ontologySourceId(drive)}`
    );
  });

  it('installs, enables and attaches a workflow per source with its source and entity types', async () => {
    await createService().reconcile({ aiIndex: aiIndex(), spaceId: SPACE, request });

    expect(client.install).toHaveBeenCalledTimes(2);
    expect(client.install).toHaveBeenCalledWith(CONTEXT_ENGINE_ONTOLOGY_ESQL_WORKFLOW_ID, {
      spaceId: SPACE,
      workflowIdSuffix: ontologyWorkflowIdSuffixFor('support', SPACE, ontologySourceId(esql)),
      values: expect.objectContaining({
        aiIndexId: 'support',
        instanceKey: suffix,
        sourceId: ontologySourceId(esql),
        sourceValue: 'FROM orders',
        entityTypes: [{ type: 'customer' }],
      }),
    });
    expect(client.install).toHaveBeenCalledWith(
      CONTEXT_ENGINE_ONTOLOGY_CONNECTOR_WORKFLOW_ID,
      expect.objectContaining({
        values: expect.objectContaining({ sourceValue: 'drive-1' }),
      })
    );
    expect(workflowsManagement.updateWorkflow).toHaveBeenCalledWith(
      ontologyWorkflowIdFor('support', SPACE, drive),
      { enabled: true },
      SPACE,
      request
    );
    expect(aiIndexService.addAutomation).toHaveBeenCalledTimes(2);
  });

  it('removes the workflow and what it wrote for a source the AI index no longer has', async () => {
    await createService().reconcile({
      aiIndex: aiIndex({ sources: [esql] }),
      previous: aiIndex(),
      spaceId: SPACE,
      request,
    });

    expect(client.uninstall).toHaveBeenCalledWith(CONTEXT_ENGINE_ONTOLOGY_CONNECTOR_WORKFLOW_ID, {
      spaceId: SPACE,
      workflowIdSuffix: ontologyWorkflowIdSuffixFor('support', SPACE, ontologySourceId(drive)),
    });
    expect(aiIndexService.removeAutomation).toHaveBeenCalledWith('support', SPACE, {
      type: 'workflow',
      value: ontologyWorkflowIdFor('support', SPACE, drive),
    });
    expect(removeOntologySource).toHaveBeenCalledTimes(1);
    expect(removeOntologySource).toHaveBeenCalledWith(
      expect.objectContaining({ sourceId: ontologySourceId(drive), aiIndexId: 'support' })
    );
    expect(client.install).toHaveBeenCalledTimes(1);
  });

  it('with discovery turned off, removes the workflows but keeps what they wrote', async () => {
    const off = aiIndex({ dreaming: { enabled: true, ontology: { enabled: false } } });

    await createService().reconcile({
      aiIndex: off,
      previous: aiIndex(),
      spaceId: SPACE,
      request,
    });

    expect(client.uninstall).toHaveBeenCalledTimes(2);
    expect(removeOntologySource).not.toHaveBeenCalled();
    expect(client.install).not.toHaveBeenCalled();
  });

  it('removes every source of a deleted AI index, without detaching from it', async () => {
    await createService().remove({ previous: aiIndex(), spaceId: SPACE, request });

    expect(client.uninstall).toHaveBeenCalledTimes(2);
    expect(removeOntologySource).toHaveBeenCalledTimes(2);
    expect(aiIndexService.removeAutomation).not.toHaveBeenCalled();
  });

  it('refuses to install a workflow it could not enable', async () => {
    const service = createOntologyScheduleService({
      logger: loggingSystemMock.createLogger(),
      getManagedWorkflowsClient: async () => client as unknown as PluginScopedManagedWorkflowsApi,
      getWorkflowsManagement: async () => undefined,
      getAiIndexService: () => aiIndexService as unknown as AiIndexService,
      getScopedEsClient: async () => ({} as ElasticsearchClient),
    });

    await expect(
      service.reconcile({ aiIndex: aiIndex(), spaceId: SPACE, request })
    ).rejects.toThrow('the workflows management plugin is not available');
    expect(client.install).not.toHaveBeenCalled();
  });
});

describe('createOntologyChangeHandler', () => {
  const service = { reconcile: jest.fn(), remove: jest.fn() };
  const request = httpServerMock.createKibanaRequest();
  const handler = (available = true) =>
    createOntologyChangeHandler(
      () => service,
      async () => available
    );

  beforeEach(() => jest.clearAllMocks());

  it('reacts to sources, dreaming and dest, on every save', () => {
    expect(handler()).toEqual(
      expect.objectContaining({ fields: ['sources', 'dreaming', 'dest'], when: 'saved' })
    );
  });

  it('reconciles a saved AI index, and removes a deleted one', async () => {
    const event = { aiIndexId: 'support', spaceId: SPACE, request, changed: new Set() };

    await handler().onChange({ ...event, previous: aiIndex(), current: aiIndex() } as never);
    expect(service.reconcile).toHaveBeenCalledWith(
      expect.objectContaining({ aiIndex: aiIndex(), previous: aiIndex() })
    );

    await handler().onChange({ ...event, previous: aiIndex(), current: undefined } as never);
    expect(service.remove).toHaveBeenCalledWith(expect.objectContaining({ previous: aiIndex() }));
  });

  it('installs nothing while dreaming is unavailable', async () => {
    const event = { aiIndexId: 'support', spaceId: SPACE, request, changed: new Set() };

    await handler(false).onChange({ ...event, current: aiIndex() } as never);

    expect(service.reconcile).not.toHaveBeenCalled();
  });
});
