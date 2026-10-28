/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ImpactPill } from '@kbn/agentic-investigations-common';
import { applyEntityStoreNames, createEntityStoreNameLookup } from './entity_store_names';

const request = httpServerMock.createKibanaRequest();

describe('applyEntityStoreNames', () => {
  const pills: ImpactPill[] = [
    { entityId: 'host:abc', count: 2, entityType: 'host', name: 'snapshot' },
    { entityId: 'service:orders', count: 1, name: 'orders' },
  ];

  it('uses the Entity Store name and keeps a stored name the store does not have', () => {
    expect(applyEntityStoreNames(pills, new Map([['host:abc', 'web-01']]))).toEqual([
      { entityId: 'host:abc', count: 2, entityType: 'host', name: 'web-01' },
      { entityId: 'service:orders', count: 1, name: 'orders' },
    ]);
  });
});

describe('createEntityStoreNameLookup', () => {
  const logger = loggingSystemMock.createLogger();

  const lookupWith = (listEntities: jest.Mock, entityStore = true) => {
    const createCRUDClient = jest.fn().mockReturnValue({ listEntities });
    const lookup = createEntityStoreNameLookup({
      getEntityStore: () => (entityStore ? ({ createCRUDClient } as never) : undefined),
      getEsClient: () => ({} as never),
      getSpaceId: () => 'default',
      logger,
    });
    return { lookup, createCRUDClient };
  };

  it('reads entity.name for the ids it is given', async () => {
    const listEntities = jest.fn().mockResolvedValue({
      entities: [
        { entity: { id: 'host:abc', name: 'web-01' } },
        { entity: { id: 'user:no-name' } },
      ],
    });
    const { lookup, createCRUDClient } = lookupWith(listEntities);

    expect(await lookup(request, ['host:abc', 'user:no-name'])).toEqual(
      new Map([['host:abc', 'web-01']])
    );
    expect(createCRUDClient).toHaveBeenCalledWith(expect.anything(), 'default');
    expect(listEntities).toHaveBeenCalledWith({
      filter: { terms: { 'entity.id': ['host:abc', 'user:no-name'] } },
      size: 2,
      source: ['entity.id', 'entity.name'],
    });
  });

  it('returns no names when Entity Store is absent or the read fails', async () => {
    const listEntities = jest.fn().mockRejectedValue(new Error('index missing'));
    const failing = lookupWith(listEntities);
    const absent = lookupWith(jest.fn(), false);

    expect(await failing.lookup(request, ['host:abc'])).toEqual(new Map());
    expect(logger.debug).toHaveBeenCalled();
    expect(await absent.lookup(request, ['host:abc'])).toEqual(new Map());
    expect(absent.createCRUDClient).not.toHaveBeenCalled();
  });
});
