/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import type { HousekeepingContext } from '@kbn/housekeeping-plugin/server';
import { policyResourceProvider } from './resource_provider';

const createContext = (isServerless = false) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const context: HousekeepingContext = {
    esClient,
    savedObjectsClient: savedObjectsClientMock.create(),
    isServerless,
    abortSignal: new AbortController().signal,
    logger: loggingSystemMock.createLogger(),
    fetchOnce: (_key, fetch) => fetch(new AbortController().signal),
  };
  return { esClient, context };
};

describe('ILM resource provider', () => {
  it('lists policies and uses in_use_by as evidence of use', async () => {
    const { esClient, context } = createContext();
    esClient.ilm.getLifecycle.mockResolvedValue({
      logs: {
        policy: { phases: {}, _meta: { managed: true } },
        in_use_by: { indices: ['.ds-logs-1'], data_streams: [], composable_templates: [] },
      },
      forgotten: {
        policy: { phases: {} },
        in_use_by: { indices: [], data_streams: [], composable_templates: [] },
      },
    } as unknown as Awaited<ReturnType<typeof esClient.ilm.getLifecycle>>);

    expect(await policyResourceProvider.listResources(context)).toEqual([
      { type: 'ilm_policy', id: 'logs', isManaged: true, inUse: true, references: [] },
      { type: 'ilm_policy', id: 'forgotten', isManaged: false, inUse: false, references: [] },
    ]);
  });

  it('points at the snapshot repositories and snapshot policies of its phases', async () => {
    const { esClient, context } = createContext();
    esClient.ilm.getLifecycle.mockResolvedValue({
      archive: {
        policy: {
          phases: {
            frozen: { actions: { searchable_snapshot: { snapshot_repository: 'backups' } } },
            delete: { actions: { wait_for_snapshot: { policy: 'nightly' }, delete: {} } },
          },
        },
      },
    } as unknown as Awaited<ReturnType<typeof esClient.ilm.getLifecycle>>);

    expect(await policyResourceProvider.listResources(context)).toEqual([
      expect.objectContaining({
        references: [
          expect.objectContaining({
            targetType: 'snapshot_repository',
            targetId: 'backups',
            via: 'frozen.searchable_snapshot.snapshot_repository',
          }),
          expect.objectContaining({
            targetType: 'slm_policy',
            targetId: 'nightly',
            via: 'delete.wait_for_snapshot.policy',
          }),
        ],
      }),
    ]);
  });

  it('is not available in serverless', () => {
    expect(policyResourceProvider.isAvailable?.(createContext(true).context)).toBe(false);
  });
});
