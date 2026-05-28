/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  createFeatureKiAdapter,
  createKnowledgeIndicatorEventIndexer,
  createQueryKiAdapter,
} from './ki_event_indexer';

const flushMicrotasks = async () => {
  for (let i = 0; i < 20; i++) {
    await Promise.resolve();
  }
};

describe('createKnowledgeIndicatorEventIndexer', () => {
  it('queues notifications received before setImpl and drains them on wire-up', async () => {
    const indexer = createKnowledgeIndicatorEventIndexer(loggerMock.create());

    indexer.notify({ kind: 'feature', id: 'feat-a', action: 'upsert' });
    indexer.notify({ kind: 'query', id: 'query-b', action: 'delete' });

    const impl = jest.fn().mockResolvedValue(undefined);
    indexer.setImpl(impl);

    await flushMicrotasks();

    expect(impl).toHaveBeenCalledTimes(2);
    expect(impl).toHaveBeenNthCalledWith(1, {
      originId: 'feature:feat-a',
      attachmentType: 'knowledge_indicator',
      action: 'create',
      spaces: ['*'],
    });
    expect(impl).toHaveBeenNthCalledWith(2, {
      originId: 'query:query-b',
      attachmentType: 'knowledge_indicator',
      action: 'delete',
      spaces: ['*'],
    });
  });

  it('drops the oldest queued notification when the buffer hits capacity', async () => {
    const logger = loggerMock.create();
    const indexer = createKnowledgeIndicatorEventIndexer(logger);

    // PENDING_QUEUE_CAPACITY is 1024 in the impl; cross it by 5 to force evictions.
    for (let i = 0; i < 1029; i++) {
      indexer.notify({ kind: 'feature', id: `feat-${i}`, action: 'upsert' });
    }

    expect(logger.warn).toHaveBeenCalledTimes(5);
    const firstWarning = (logger.warn as jest.Mock).mock.calls[0]?.[0] as string;
    expect(firstWarning).toContain('pending queue at capacity');

    const impl = jest.fn().mockResolvedValue(undefined);
    indexer.setImpl(impl);
    await flushMicrotasks();

    expect(impl).toHaveBeenCalledTimes(1024);
    const firstCall = impl.mock.calls[0][0];
    expect(firstCall.originId).toBe('feature:feat-5');
    const lastCall = impl.mock.calls[1023][0];
    expect(lastCall.originId).toBe('feature:feat-1028');
  });

  it('serializes notifications per origin id and parallelizes across origins', async () => {
    const indexer = createKnowledgeIndicatorEventIndexer(loggerMock.create());
    let resolveSameOriginFirst!: () => void;
    let resolveSameOriginSecond!: () => void;
    let resolveOtherOrigin!: () => void;
    const order: string[] = [];

    const impl = jest.fn().mockImplementation(({ originId, action }) => {
      order.push(`start ${originId} ${action}`);
      if (originId === 'feature:feat-a' && action === 'create') {
        return new Promise<void>((resolve) => {
          resolveSameOriginFirst = () => {
            order.push(`end ${originId} ${action}`);
            resolve();
          };
        });
      }
      if (originId === 'feature:feat-a' && action === 'delete') {
        return new Promise<void>((resolve) => {
          resolveSameOriginSecond = () => {
            order.push(`end ${originId} ${action}`);
            resolve();
          };
        });
      }
      if (originId === 'feature:feat-b') {
        return new Promise<void>((resolve) => {
          resolveOtherOrigin = () => {
            order.push(`end ${originId} ${action}`);
            resolve();
          };
        });
      }
      return Promise.resolve();
    });

    indexer.setImpl(impl);
    indexer.notify({ kind: 'feature', id: 'feat-a', action: 'upsert' });
    indexer.notify({ kind: 'feature', id: 'feat-a', action: 'delete' });
    indexer.notify({ kind: 'feature', id: 'feat-b', action: 'upsert' });

    await flushMicrotasks();

    // Same origin: only the first call has started; second is queued behind it.
    expect(order).toEqual(['start feature:feat-a create', 'start feature:feat-b create']);

    resolveOtherOrigin();
    await flushMicrotasks();
    expect(order).toContain('end feature:feat-b create');
    // feat-a delete is still queued behind feat-a create.
    expect(order).not.toContain('start feature:feat-a delete');

    resolveSameOriginFirst();
    await flushMicrotasks();
    expect(order).toContain('end feature:feat-a create');
    expect(order).toContain('start feature:feat-a delete');

    resolveSameOriginSecond();
    await flushMicrotasks();
    expect(order).toContain('end feature:feat-a delete');
  });

  it('logs and continues when the underlying impl rejects', async () => {
    const logger = loggerMock.create();
    const indexer = createKnowledgeIndicatorEventIndexer(logger);

    const impl = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined);
    indexer.setImpl(impl);

    indexer.notify({ kind: 'feature', id: 'feat-a', action: 'upsert' });
    indexer.notify({ kind: 'feature', id: 'feat-b', action: 'upsert' });

    await flushMicrotasks();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`upsert for 'feature:feat-a' failed: boom`)
    );
    expect(impl).toHaveBeenCalledTimes(2);
  });
});

describe('KI adapters', () => {
  it('createFeatureKiAdapter forwards (action, id) and stamps kind=feature', () => {
    const indexer = { notify: jest.fn() };
    const adapter = createFeatureKiAdapter(indexer);
    adapter.notify('upsert', 'feat-1');
    expect(indexer.notify).toHaveBeenCalledWith({
      kind: 'feature',
      id: 'feat-1',
      action: 'upsert',
    });
  });

  it('createQueryKiAdapter forwards (action, id) and stamps kind=query', () => {
    const indexer = { notify: jest.fn() };
    const adapter = createQueryKiAdapter(indexer);
    adapter.notify('delete', 'query-1');
    expect(indexer.notify).toHaveBeenCalledWith({
      kind: 'query',
      id: 'query-1',
      action: 'delete',
    });
  });
});
