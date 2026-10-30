/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { createActor, fromPromise, waitFor } from 'xstate';
import {
  createEntityTableMachine,
  createEntityTableMachineImplementations,
} from './entity_table_machine';
import type { EntityTableUrlState } from './types';

interface TestItem {
  name: string;
}

const URL_STATE_KEY = 'testTable';

const DEFAULT_URL_STATE: EntityTableUrlState = {
  query: '',
  sortField: 'name',
  sortDirection: 'asc',
  pageIndex: 0,
  pageSize: 25,
};

const createTestActor = ({
  urlStateValues = null,
  fetchItems = async () => [{ name: 'item-1' }],
}: {
  urlStateValues?: unknown;
  fetchItems?: () => Promise<TestItem[]>;
} = {}) => {
  const get = jest.fn().mockReturnValue(urlStateValues);
  const set = jest.fn();
  const urlStateStorageContainer = { get, set } as unknown as IKbnUrlStateStorage;

  const machine = createEntityTableMachine<TestItem>();
  const actor = createActor(
    machine.provide(
      createEntityTableMachineImplementations<TestItem>({
        core: coreMock.createStart(),
        urlStateStorageContainer,
        urlStateKey: URL_STATE_KEY,
        defaultUrlState: DEFAULT_URL_STATE,
        fetchItems: fromPromise(() => fetchItems()),
      })
    ),
    { input: { defaultUrlState: DEFAULT_URL_STATE } }
  );

  return { actor, set };
};

describe('entityTableMachine', () => {
  it('initializes from defaults, syncs the URL, and loads items', async () => {
    const { actor, set } = createTestActor();

    actor.start();
    await waitFor(actor, (state) => state.matches('ready'));

    expect(actor.getSnapshot().context.items).toEqual([{ name: 'item-1' }]);
    expect(actor.getSnapshot().context.urlState).toEqual(DEFAULT_URL_STATE);
    expect(set).toHaveBeenCalledWith(URL_STATE_KEY, DEFAULT_URL_STATE, { replace: false });
  });

  it('merges valid URL state with the defaults', async () => {
    const { actor } = createTestActor({
      urlStateValues: { query: 'nginx', pageSize: 50 },
    });

    actor.start();
    await waitFor(actor, (state) => state.matches('ready'));

    expect(actor.getSnapshot().context.urlState).toEqual({
      ...DEFAULT_URL_STATE,
      query: 'nginx',
      pageSize: 50,
    });
  });

  it('falls back to the defaults when the URL state is invalid', async () => {
    const { actor } = createTestActor({
      urlStateValues: { sortDirection: 'sideways' },
    });

    actor.start();
    await waitFor(actor, (state) => state.matches('ready'));

    expect(actor.getSnapshot().context.urlState).toEqual(DEFAULT_URL_STATE);
  });

  it('falls back to the defaults when the URL pageSize is not an allowed option', async () => {
    const { actor } = createTestActor({
      urlStateValues: { pageSize: 1 },
    });

    actor.start();
    await waitFor(actor, (state) => state.matches('ready'));

    expect(actor.getSnapshot().context.urlState).toEqual(DEFAULT_URL_STATE);
  });

  it('moves to failure when the fetch fails and recovers on refresh', async () => {
    const fetchItems = jest
      .fn<Promise<TestItem[]>, []>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([{ name: 'item-2' }]);
    const { actor } = createTestActor({ fetchItems });

    actor.start();
    await waitFor(actor, (state) => state.matches('failure'));
    expect(actor.getSnapshot().context.error?.message).toBe('boom');

    actor.send({ type: 'items.refresh' });
    await waitFor(actor, (state) => state.matches('ready'));

    expect(actor.getSnapshot().context.items).toEqual([{ name: 'item-2' }]);
    expect(actor.getSnapshot().context.error).toBeNull();
  });

  it('refetches items on refresh while staying in ready afterwards', async () => {
    const fetchItems = jest
      .fn<Promise<TestItem[]>, []>()
      .mockResolvedValueOnce([{ name: 'item-1' }])
      .mockResolvedValueOnce([{ name: 'item-1' }, { name: 'item-2' }]);
    const { actor } = createTestActor({ fetchItems });

    actor.start();
    await waitFor(actor, (state) => state.matches('ready'));

    actor.send({ type: 'items.refresh' });
    await waitFor(actor, (state) => state.matches('ready'));

    expect(fetchItems).toHaveBeenCalledTimes(2);
    expect(actor.getSnapshot().context.items).toHaveLength(2);
  });

  it('updates the query, resets the page, and syncs the URL on search', async () => {
    const { actor, set } = createTestActor({
      urlStateValues: { pageIndex: 3 },
    });

    actor.start();
    await waitFor(actor, (state) => state.matches('ready'));
    expect(actor.getSnapshot().context.urlState.pageIndex).toBe(3);

    actor.send({ type: 'search.change', query: 'nginx' });

    const { urlState } = actor.getSnapshot().context;
    expect(urlState.query).toBe('nginx');
    expect(urlState.pageIndex).toBe(0);
    expect(set).toHaveBeenLastCalledWith(URL_STATE_KEY, urlState, { replace: true });
  });

  it('updates the sort, resets the page, and syncs the URL on sort.change', async () => {
    const { actor } = createTestActor({
      urlStateValues: { pageIndex: 3 },
    });

    actor.start();
    await waitFor(actor, (state) => state.matches('ready'));
    expect(actor.getSnapshot().context.urlState.pageIndex).toBe(3);

    actor.send({ type: 'sort.change', sortField: 'retentionMs', sortDirection: 'desc' });

    expect(actor.getSnapshot().context.urlState).toEqual({
      ...DEFAULT_URL_STATE,
      sortField: 'retentionMs',
      sortDirection: 'desc',
      pageIndex: 0,
    });
  });

  it('updates the pagination on page.change', async () => {
    const { actor } = createTestActor();

    actor.start();
    await waitFor(actor, (state) => state.matches('ready'));

    actor.send({ type: 'page.change', pageIndex: 2, pageSize: 50 });

    expect(actor.getSnapshot().context.urlState).toEqual({
      ...DEFAULT_URL_STATE,
      pageIndex: 2,
      pageSize: 50,
    });
  });
});
