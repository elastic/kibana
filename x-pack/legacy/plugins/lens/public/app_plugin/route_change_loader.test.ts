/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { last, uniq } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { routeChangeLoader, Opts } from './route_change_loader';
import { IndexPattern as IndexPatternInstance } from 'src/legacy/core_plugins/data/public';
import { Document } from '../persistence/saved_object_store';
import { getStateChanges, waitForPromises } from '../test_helpers';

function testOpts() {
  const route$ = new BehaviorSubject<{ docId?: string; redirectTo: (id?: string) => void }>({
    redirectTo() {},
  });
  const state$ = new BehaviorSubject<{ persistedDoc?: { id: string } }>({});

  return {
    docStorage: {
      load: jest.fn(() => Promise.resolve({ id: 'foo' } as Document)),
      save: jest.fn(),
    },
    indexPatternsService: {
      get: jest.fn(() => Promise.resolve({} as IndexPatternInstance)),
    },
    notifications: { toasts: { addDanger: jest.fn() } },
    route$,
    setState: jest.fn(),
    state$,
  };
}

async function testLoading(optsOverrides: object = {}) {
  const opts = testOpts();
  const loadingOpts = {
    ...opts,
    docStorage: {
      ...opts.docStorage,
      load: async (id: string) =>
        (({
          id,
          state: {
            query: { language: 'kql', query: 'wat' },
            filters: [{ meta: { negate: true, disabled: true, alias: 'ffff' } }],
            datasourceMetaData: {
              filterableIndexPatterns: [{ id: 'a' }, { id: 'b' }],
            },
          },
        } as unknown) as Document),
    },
    indexPatternsService: {
      get: (id: string) => Promise.resolve(({ id } as unknown) as IndexPatternInstance),
    },
  };

  const redirectTo = jest.fn();
  const finalOpts = { ...loadingOpts, ...optsOverrides } as typeof opts;

  routeChangeLoader(finalOpts as Opts);

  opts.route$.next({ docId: 'aaaa', redirectTo });

  await waitForPromises();

  return { ...finalOpts, redirectTo };
}

describe('routeChangeLoader', () => {
  it('should do nothing if docId is empty', async () => {
    const opts = testOpts();

    routeChangeLoader(opts);
    opts.route$.next({ redirectTo: jest.fn() });

    await waitForPromises();
    expect(opts.setState).not.toHaveBeenCalled();
  });

  it('should do nothing if docId matches the current doc', async () => {
    const opts = testOpts();

    routeChangeLoader(opts);
    opts.state$.next({ persistedDoc: { id: 'aaaa' } });
    opts.route$.next({ docId: 'aaaa', redirectTo: jest.fn() });

    await waitForPromises();
    expect(opts.setState).not.toHaveBeenCalled();
  });

  it('should handle doc load failure', async () => {
    const { setState, notifications, redirectTo } = await testLoading({
      docStorage: {
        load: () => Promise.reject('NOPE!'),
      },
    });

    expect(notifications.toasts.addDanger).toHaveBeenCalled();
    expect(redirectTo).toHaveBeenCalled();
    expect(
      uniq(getStateChanges(setState).map((s: { isLoading: boolean }) => s.isLoading))
    ).toEqual([true, false]);
  });

  it('should handle index pattern load failure', async () => {
    const { setState, notifications, redirectTo } = await testLoading({
      indexPatternsService: { get: () => Promise.reject(new Error('NOPE!')) },
    });

    expect(notifications.toasts.addDanger).toHaveBeenCalled();
    expect(redirectTo).toHaveBeenCalled();
    expect(
      uniq(getStateChanges(setState).map((s: { isLoading: boolean }) => s.isLoading))
    ).toEqual([true, false]);
  });

  it('should load the referenced docs', async () => {
    const { setState, notifications, redirectTo } = await testLoading();
    const stateChanges = getStateChanges(setState);

    expect(notifications.toasts.addDanger).not.toHaveBeenCalled();
    expect(redirectTo).not.toHaveBeenCalled();
    expect(uniq(stateChanges.map((s: { isLoading: boolean }) => s.isLoading))).toEqual([
      true,
      false,
    ]);
    expect(last(stateChanges)).toMatchObject({
      isLoading: false,
      persistedDoc: expect.objectContaining({ id: 'aaaa' }),
      lastKnownDoc: expect.objectContaining({ id: 'aaaa' }),
      query: { language: 'kql', query: 'wat' },
      filters: [{ meta: { negate: true, disabled: true, alias: 'ffff' } }],
      indexPatternsForTopNav: [{ id: 'a' }, { id: 'b' }],
    });
  });
});
