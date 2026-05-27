/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import { InboxActionRegistry, isUnknownInboxSourceAppError } from './inbox_action_registry';
import type { InboxActionProvider, InboxRequestContext } from './inbox_action_provider';
import {
  createStubInboxAction,
  createStubInboxActions,
} from '../../common/test_helpers/create_stub_inbox_action';

const ctx = (): InboxRequestContext => ({
  request: httpServerMock.createKibanaRequest(),
  spaceId: 'default',
});

const fakeProvider = (
  sourceApp: string,
  actions = createStubInboxActions(3, { source_app: sourceApp })
): jest.Mocked<InboxActionProvider> => ({
  sourceApp,
  list: jest.fn<ReturnType<InboxActionProvider['list']>, Parameters<InboxActionProvider['list']>>(
    async () => ({ actions, total: actions.length })
  ),
  respond: jest.fn<
    ReturnType<InboxActionProvider['respond']>,
    Parameters<InboxActionProvider['respond']>
  >(async () => {}),
});

describe('InboxActionRegistry', () => {
  let logger: ReturnType<typeof loggerMock.create>;
  let registry: InboxActionRegistry;

  beforeEach(() => {
    logger = loggerMock.create();
    registry = new InboxActionRegistry(logger);
  });

  describe('register()', () => {
    it('accepts a new provider', () => {
      const provider = fakeProvider('workflows');
      expect(() => registry.register(provider)).not.toThrow();
      expect(registry.has('workflows')).toBe(true);
    });

    it('throws when the same sourceApp registers twice', () => {
      registry.register(fakeProvider('workflows'));
      expect(() => registry.register(fakeProvider('workflows'))).toThrow(/already registered/);
    });
  });

  describe('list()', () => {
    it('returns empty when no providers are registered', async () => {
      const result = await registry.list({ page: 1, perPage: 25 }, ctx());
      expect(result).toEqual({ actions: [], total: 0 });
    });

    it('forwards the status filter to each provider', async () => {
      const workflows = fakeProvider('workflows');
      registry.register(workflows);

      await registry.list({ page: 1, perPage: 25, status: 'pending' }, ctx());

      expect(workflows.list).toHaveBeenCalledWith(
        { status: 'pending' },
        expect.objectContaining({ spaceId: 'default' })
      );
    });

    it('scopes to a single provider when sourceApp is specified', async () => {
      const workflows = fakeProvider('workflows');
      const evals = fakeProvider('evals');
      registry.register(workflows);
      registry.register(evals);

      await registry.list({ page: 1, perPage: 25, sourceApp: 'workflows' }, ctx());

      expect(workflows.list).toHaveBeenCalledTimes(1);
      expect(evals.list).not.toHaveBeenCalled();
    });

    it('returns empty when sourceApp matches no registered provider', async () => {
      registry.register(fakeProvider('workflows'));

      const result = await registry.list({ page: 1, perPage: 25, sourceApp: 'unknown' }, ctx());

      expect(result).toEqual({ actions: [], total: 0 });
    });

    it('merge-sorts actions from all providers by created_at desc', async () => {
      const workflows = fakeProvider('workflows', [
        createStubInboxAction({
          id: 'w-1',
          source_app: 'workflows',
          created_at: '2026-04-24T10:00:00.000Z',
        }),
        createStubInboxAction({
          id: 'w-2',
          source_app: 'workflows',
          created_at: '2026-04-24T12:00:00.000Z',
        }),
      ]);
      const evals = fakeProvider('evals', [
        createStubInboxAction({
          id: 'e-1',
          source_app: 'evals',
          created_at: '2026-04-24T11:00:00.000Z',
        }),
      ]);
      registry.register(workflows);
      registry.register(evals);

      const result = await registry.list({ page: 1, perPage: 25 }, ctx());

      expect(result.actions.map((action) => action.id)).toEqual(['w-2', 'e-1', 'w-1']);
      expect(result.total).toBe(3);
    });

    it('paginates after merge-sorting', async () => {
      const actions = Array.from({ length: 5 }, (_, i) =>
        createStubInboxAction({
          id: `a-${i}`,
          source_app: 'workflows',
          // Ensure deterministic ordering by stamping decreasing timestamps.
          created_at: new Date(Date.UTC(2026, 3, 24, 12, i)).toISOString(),
        })
      );
      registry.register(fakeProvider('workflows', actions));

      const page1 = await registry.list({ page: 1, perPage: 2 }, ctx());
      const page2 = await registry.list({ page: 2, perPage: 2 }, ctx());
      const page3 = await registry.list({ page: 3, perPage: 2 }, ctx());

      expect(page1.total).toBe(5);
      expect(page1.actions.map((a) => a.id)).toEqual(['a-4', 'a-3']);
      expect(page2.actions.map((a) => a.id)).toEqual(['a-2', 'a-1']);
      expect(page3.actions.map((a) => a.id)).toEqual(['a-0']);
    });

    it('clamps total to the merge-sorted slice length when a provider reports truncation', async () => {
      // Providers like the workflows provider ask the underlying service
      // for a bounded slice but surface the full ES `total`. If we trusted
      // that number verbatim the client would see pagination controls for
      // pages that can never be produced — reproducing an empty-inbox bug
      // when the actual items lived past the provider's slice. The
      // registry clamps `total` to what it can merge-sort over.
      const truncating: InboxActionProvider = {
        sourceApp: 'workflows',
        list: jest.fn(async () => ({
          actions: createStubInboxActions(2, { source_app: 'workflows' }),
          total: 50, // reported, but only 2 rows actually returned
        })),
        respond: jest.fn(async () => {}),
      };
      registry.register(truncating);

      const result = await registry.list({ page: 1, perPage: 25 }, ctx());

      expect(result.total).toBe(2);
      expect(result.actions).toHaveLength(2);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('workflows'));
    });

    it('treats a single provider failure as empty and does not short-circuit other providers', async () => {
      const failing = fakeProvider('workflows');
      failing.list.mockRejectedValueOnce(new Error('boom'));
      const healthy = fakeProvider('evals', [
        createStubInboxAction({ id: 'healthy-1', source_app: 'evals' }),
      ]);
      registry.register(failing);
      registry.register(healthy);

      const result = await registry.list({ page: 1, perPage: 25 }, ctx());

      expect(result.actions.map((a) => a.id)).toEqual(['healthy-1']);
      expect(result.total).toBe(1);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('workflows'));
    });
  });

  describe('respondTo()', () => {
    it('dispatches to the matching provider', async () => {
      const workflows = fakeProvider('workflows');
      registry.register(workflows);

      await registry.respondTo('workflows', 'source-1', { approved: true }, ctx());

      expect(workflows.respond).toHaveBeenCalledWith(
        'source-1',
        { approved: true },
        expect.objectContaining({ spaceId: 'default' })
      );
    });

    it('throws UnknownInboxSourceAppError when the sourceApp is not registered', async () => {
      await expect(registry.respondTo('workflows', 'source-1', {}, ctx())).rejects.toThrow(
        /No inbox action provider registered/
      );
      // Belt-and-suspenders: also verify the structured error so the route
      // can branch on `isUnknownInboxSourceAppError(err)` instead of regex.
      const err = await registry
        .respondTo('workflows', 'source-1', {}, ctx())
        .catch((e: unknown) => e);
      expect(isUnknownInboxSourceAppError(err)).toBe(true);
    });
  });
});
