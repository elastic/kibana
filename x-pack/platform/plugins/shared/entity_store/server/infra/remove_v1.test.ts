/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { stopAndRemoveV1 } from './remove_v1';

describe('stopAndRemoveV1', () => {
  const namespace = 'default';
  const type = 'user' as const;
  const definitionId = `security_${type}_${namespace}`;

  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let taskManager: jest.Mocked<Pick<TaskManagerStartContract, 'removeIfExists'>>;
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    taskManager = { removeIfExists: jest.fn().mockResolvedValue(undefined) };
    savedObjectsClient = savedObjectsClientMock.create();
    // savedObjectsClientMock.create() creates jest.fn() stubs that return undefined by default.
    // The production code chains .catch() on the return value, so it must be a Promise.
    savedObjectsClient.delete.mockResolvedValue({} as any);
  });

  const run = () =>
    stopAndRemoveV1({
      type,
      namespace,
      logger: loggerMock.create(),
      esClient,
      taskManager: taskManager as unknown as TaskManagerStartContract,
      savedObjectsClient,
    });

  it('deletes the raw entity-definition SO document from .kibana with ignore: [404]', async () => {
    await run();

    // The entity-definition SO type is no longer registered, so stopAndRemoveV1 deletes
    // the underlying Elasticsearch document directly. The exact raw _id is the contract:
    // `entity-definition:<definitionId>` (namespaceType was 'multiple-isolated', so no
    // namespace prefix). The call must tolerate 404 in case the doc was never written.
    expect(esClient.delete).toHaveBeenCalledWith(
      { index: '.kibana', id: `entity-definition:${definitionId}` },
      { ignore: [404] }
    );
  });

  it('deletes v1 transforms, pipelines, templates, enrich policy, indices, and data stream', async () => {
    await run();

    // Transforms
    expect(esClient.transform.stopTransform).toHaveBeenCalledWith(
      expect.objectContaining({ transform_id: `entities-v1-latest-${definitionId}` }),
      { ignore: [404, 409] }
    );
    expect(esClient.transform.deleteTransform).toHaveBeenCalledWith(
      expect.objectContaining({ transform_id: `entities-v1-history-${definitionId}` }),
      { ignore: [404] }
    );

    // Ingest pipeline
    expect(esClient.ingest.deletePipeline).toHaveBeenCalledWith(
      { id: `entities-v1-latest-${definitionId}` },
      { ignore: [404] }
    );

    // Index template
    expect(esClient.indices.deleteIndexTemplate).toHaveBeenCalledWith(
      { name: `entities_v1_reset_${definitionId}_index_template` },
      { ignore: [404] }
    );

    // Component template
    expect(esClient.cluster.deleteComponentTemplate).toHaveBeenCalledWith(
      { name: `${definitionId}-updates@platform` },
      { ignore: [404] }
    );

    // Enrich policy
    expect(esClient.enrich.deletePolicy).toHaveBeenCalledWith(
      { name: `entity_store_field_retention_${type}_${namespace}_v1.0.0` },
      { ignore: [404] }
    );

    // Reset index
    expect(esClient.indices.delete).toHaveBeenCalledWith(
      { index: `.entities.v1.reset.${definitionId}` },
      { ignore: [404] }
    );

    // Updates data stream
    expect(esClient.indices.deleteDataStream).toHaveBeenCalledWith(
      { name: `.entities.v1.updates.${definitionId}` },
      { ignore: [404] }
    );
  });

  it('removes v1 task manager tasks', async () => {
    await run();

    expect(taskManager.removeIfExists).toHaveBeenCalledWith(
      `entity_store:snapshot:${type}:${namespace}:1.0.0`
    );
  });

  it('deletes the legacy entity-engine-status SO descriptor', async () => {
    await run();

    expect(savedObjectsClient.delete).toHaveBeenCalledWith(
      'entity-engine-status',
      `entity-engine-descriptor-${type}-${namespace}`
    );
  });

  it('tolerates a 404 on the entity-engine-status SO delete', async () => {
    savedObjectsClient.delete.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('entity-engine-status', 'test-id')
    );

    // Must not throw — the 404 is expected when v1 was never enabled in this space.
    await expect(run()).resolves.toBeUndefined();
  });

  it('tolerates a forbidden error on the entity-engine-status SO delete', async () => {
    savedObjectsClient.delete.mockRejectedValue(
      SavedObjectsErrorHelpers.decorateForbiddenError(new Error('forbidden'))
    );

    // isForbiddenError errors are swallowed so a missing privilege never blocks install.
    await expect(run()).resolves.toBeUndefined();
  });

  it('surfaces other SO delete errors as a resource-removal failure (via tryAsBoolean → retry)', async () => {
    // tryAsBoolean catches all rejections and returns false; the caller then
    // throws "Failed to remove one or more entity store v1 resources" which
    // triggers retries. After RETRY_ON_FAILURE_TIMES the last error propagates.
    savedObjectsClient.delete.mockRejectedValue(new Error('unexpected database error'));

    await expect(run()).rejects.toThrow(
      'Failed to remove one or more entity store v1 resources for type: user'
    );
  });

  it('retries on transient ES failure and succeeds on second attempt', async () => {
    // stopTransform is the first ES call; fail it once to trigger a retry of the whole function.
    esClient.transform.stopTransform
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValue({} as any);

    await expect(run()).resolves.toBeUndefined();
    // 2 transforms × 2 attempts (1 fail → retry → 1 success each)
    expect(esClient.transform.stopTransform).toHaveBeenCalledTimes(4);
  });

  it('throws after exhausting all retry attempts', async () => {
    esClient.transform.stopTransform.mockRejectedValue(new Error('persistent'));

    await expect(run()).rejects.toThrow();
  });
});
