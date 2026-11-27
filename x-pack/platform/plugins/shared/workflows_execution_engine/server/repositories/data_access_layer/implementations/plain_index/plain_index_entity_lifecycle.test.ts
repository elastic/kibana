/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { PlainIndexEntityLifecycle } from './plain_index_entity_lifecycle';
import {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '../../constants/execution_indexes';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS } from '../../mappings/step_executions_mappings';
import { WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS } from '../../mappings/workflow_executions_mappings';

describe('PlainIndexEntityLifecycle', () => {
  it('creates workflow and step clients backed by their system indices', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
    esClient.indices.exists.mockResolvedValue(true as never);
    esClient.indices.putMapping.mockResolvedValue({ acknowledged: true } as never);

    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    Object.defineProperty(coreStart.elasticsearch.client, 'asInternalUser', {
      configurable: true,
      value: esClient,
    });

    const logger = loggerMock.create();
    const workflow = new PlainIndexEntityLifecycle({
      logger,
      indexName: WORKFLOWS_EXECUTIONS_INDEX,
      mappings: WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
    });
    const step = new PlainIndexEntityLifecycle({
      logger,
      indexName: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      mappings: WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
    });

    await expect(workflow.initSetup(coreSetup)).resolves.toBeUndefined();
    await expect(step.initSetup(coreSetup)).resolves.toBeUndefined();
    await expect(workflow.initStart(coreStart)).resolves.toBeUndefined();
    await expect(step.initStart(coreStart)).resolves.toBeUndefined();

    expect(esClient.indices.exists).toHaveBeenCalledWith({ index: WORKFLOWS_EXECUTIONS_INDEX });
    expect(esClient.indices.exists).toHaveBeenCalledWith({
      index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
    });

    const workflowExecutionsDataClient = workflow.createClient();
    const stepExecutionsDataClient = step.createClient();

    await workflowExecutionsDataClient.search({ query: { match_all: {} } });
    await stepExecutionsDataClient.search({ query: { match_all: {} } });

    expect(esClient.search).toHaveBeenNthCalledWith(1, {
      index: WORKFLOWS_EXECUTIONS_INDEX,
      query: { match_all: {} },
    });
    expect(esClient.search).toHaveBeenNthCalledWith(2, {
      index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      query: { match_all: {} },
    });
  });
});
