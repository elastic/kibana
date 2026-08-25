/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  deleteSmlMappingsComponentTemplate,
  ensureSmlMappingsComponentTemplate,
} from './sml_component_template';
import { smlMappingsComponentTemplateName } from './sml_storage';

const createEsClient = () =>
  ({
    cluster: {
      putComponentTemplate: jest.fn().mockResolvedValue({ acknowledged: true }),
      deleteComponentTemplate: jest.fn().mockResolvedValue({ acknowledged: true }),
    },
  } as unknown as jest.Mocked<ElasticsearchClient> & {
    cluster: {
      putComponentTemplate: jest.Mock;
      deleteComponentTemplate: jest.Mock;
    };
  });

const logger = { error: jest.fn(), debug: jest.fn() } as unknown as Logger;

describe('ensureSmlMappingsComponentTemplate', () => {
  let esClient: ReturnType<typeof createEsClient>;

  beforeEach(async () => {
    jest.clearAllMocks();
    esClient = createEsClient();
    // Reset the module-level memo so each test starts from a clean slate.
    await deleteSmlMappingsComponentTemplate({ esClient });
    esClient.cluster.deleteComponentTemplate.mockClear();
  });

  it('installs the component under the SML-owned name', async () => {
    await ensureSmlMappingsComponentTemplate({ esClient, logger });

    expect(esClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(1);
    expect(esClient.cluster.putComponentTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: smlMappingsComponentTemplateName,
        _meta: expect.objectContaining({ managed: true, managed_by: 'agentBuilderSml' }),
      })
    );
  });

  it('is named for SML rather than claiming the shared ai-index@custom slot', () => {
    expect(smlMappingsComponentTemplateName).toBe('ai-index-idx-sml-data@mappings');
    expect(smlMappingsComponentTemplateName).not.toBe('ai-index@custom');
  });

  it('carries the fields the base ai-index@mappings component does not provide', async () => {
    await ensureSmlMappingsComponentTemplate({ esClient, logger });

    const { template } = esClient.cluster.putComponentTemplate.mock.calls[0][0];
    const { properties } = template.mappings;

    expect(Object.keys(properties).sort()).toEqual([
      'created_at',
      'extended_attrs',
      'id',
      'ingestion_method',
      'origin',
      'permissions',
      'spaces',
      'tags',
      'type',
      'updated_at',
      'user_id',
    ]);
  });

  it('overrides tags and type with the lowercase normalizer the base component lacks', async () => {
    await ensureSmlMappingsComponentTemplate({ esClient, logger });

    const { template } = esClient.cluster.putComponentTemplate.mock.calls[0][0];
    expect(template.mappings.properties.tags).toMatchObject({
      type: 'keyword',
      normalizer: 'lowercase',
    });
    expect(template.mappings.properties.type).toMatchObject({
      type: 'keyword',
      normalizer: 'lowercase',
    });
  });

  it('does not redeclare base fields it has nothing to override', async () => {
    await ensureSmlMappingsComponentTemplate({ esClient, logger });

    const { template } = esClient.cluster.putComponentTemplate.mock.calls[0][0];
    const keys = Object.keys(template.mappings.properties);

    // `type` is redeclared to add the lowercase normalizer, so it is intentionally
    // absent from this list; these fields are taken verbatim from the base.
    for (const baseField of ['title', 'description', 'content', 'references']) {
      expect(keys).not.toContain(baseField);
    }
  });

  it('installs once across repeated calls', async () => {
    await ensureSmlMappingsComponentTemplate({ esClient, logger });
    await ensureSmlMappingsComponentTemplate({ esClient, logger });
    await ensureSmlMappingsComponentTemplate({ esClient, logger });

    expect(esClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(1);
  });

  it('re-verifies the install once the re-verify interval elapses (self-heals)', async () => {
    const nowSpy = jest.spyOn(Date, 'now');
    try {
      nowSpy.mockReturnValue(1_000);
      await ensureSmlMappingsComponentTemplate({ esClient, logger });
      expect(esClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(1);

      // Still within the interval: the memoized install is trusted, no re-put.
      nowSpy.mockReturnValue(1_000 + 60_000);
      await ensureSmlMappingsComponentTemplate({ esClient, logger });
      expect(esClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(1);

      // Past the interval: re-put so an out-of-band delete or edit is repaired.
      nowSpy.mockReturnValue(1_000 + 6 * 60_000);
      await ensureSmlMappingsComponentTemplate({ esClient, logger });
      expect(esClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('retries on the next call when the install fails', async () => {
    esClient.cluster.putComponentTemplate
      .mockRejectedValueOnce(new Error('cluster unavailable'))
      .mockResolvedValueOnce({ acknowledged: true });

    await expect(ensureSmlMappingsComponentTemplate({ esClient, logger })).rejects.toThrow(
      'cluster unavailable'
    );
    expect(logger.error).toHaveBeenCalled();

    await expect(ensureSmlMappingsComponentTemplate({ esClient, logger })).resolves.toBeUndefined();
    expect(esClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);
  });
});
