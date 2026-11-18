/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { loggerMock } from '@kbn/logging-mocks';
import type { LedgerEntry } from '../../common';
import type { BootstrapInput } from '../reader/read_bootstrap_files';
import { ResourceKindRegistry } from '../registry/resource_kind_registry';
import type { OwnershipContext, RemoveResult, StoredVersion } from '@kbn/resource-bootstrap-server';
import { ledgerIdOf } from './owned_state';
import { pruneOwned } from './prune_owned';

const view = (id: string, spaces = ['default']): LedgerEntry => ({
  kind: 'data_view',
  id,
  spaces,
  appliedHash: 'h',
  objectVersion: 'v1',
});

/** Owned before a create that was never confirmed. */
const unconfirmedView = (id: string, spaces = ['default']): LedgerEntry => ({
  kind: 'data_view',
  id,
  spaces,
});

const docIdOf = (id: string) => ledgerIdOf('data_view', id);

const stateOf = (...entries: LedgerEntry[]) =>
  new Map(entries.map((entry) => [docIdOf(entry.id), entry]));

/** Files that declare something, so pruning is allowed. */
const declaredInput: BootstrapInput = {
  hash: 'h',
  groups: [{ kind: 'data_view', documents: [{ source: 'a.data_view.json entry 1', body: {} }] }],
};

describe('pruneOwned', () => {
  const logger = loggerMock.create();
  const signal = new AbortController().signal;
  let versions: jest.Mock<Promise<Record<string, StoredVersion>>, [OwnershipContext]>;
  let remove: jest.Mock<Promise<RemoveResult>, [OwnershipContext]>;
  let registry: ResourceKindRegistry;
  const ledger = { remove: jest.fn(async (_docIds: string[]) => {}) };

  beforeEach(() => {
    jest.clearAllMocks();
    // Never read: pruning does not ask whether an object changed.
    versions = jest.fn(
      async (_context: OwnershipContext): Promise<Record<string, StoredVersion>> => ({})
    );
    remove = jest.fn(async ({ ids }: OwnershipContext) => ({ removed: ids.length, errors: [] }));
    registry = new ResourceKindRegistry();
    registry.register({
      id: 'data_view',
      spaces: 'shared',
      parse: (document) => schema.object({ id: schema.string() }).validate(document),
      idOf: ({ id }) => id,
      apply: async () => ({ applied: 0, errors: [] }),
      ownership: { versions, remove },
    });
  });

  const run = ({
    owned,
    declared = [],
    prune = true,
    input = declaredInput,
    status = 'completed',
    runSignal = signal,
  }: {
    owned: Map<string, LedgerEntry>;
    declared?: string[];
    prune?: boolean;
    input?: BootstrapInput;
    status?: 'completed' | 'failed';
    runSignal?: AbortSignal;
  }) =>
    pruneOwned({
      prune,
      input,
      outcome: { status, declared: new Set(declared.map(docIdOf)) },
      owned,
      registry,
      ledger,
      signal: runSignal,
      logger,
    });

  it('deletes every owned object that left the files, then forgets it', async () => {
    const result = await run({ owned: stateOf(view('kept'), view('gone')), declared: ['kept'] });

    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default', ids: ['gone'] })
    );
    expect(ledger.remove).toHaveBeenCalledWith([docIdOf('gone')]);
    expect(result).toEqual({ pruned: { data_view: 1 }, errors: [] });
  });

  it('deletes an owned object whatever happened to it since, since the files decide', async () => {
    // Nothing about the stored object is read: an edit made by hand does not keep it.
    await run({ owned: stateOf({ ...view('edited'), objectVersion: 'old' }) });

    expect(versions).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith(expect.objectContaining({ ids: ['edited'] }));
  });

  it('deletes an object whose create was never confirmed like any other, since its id is owned', async () => {
    const result = await run({
      owned: stateOf(view('gone'), unconfirmedView('created'), unconfirmedView('missing')),
    });

    expect(versions).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default', ids: ['gone', 'created', 'missing'] })
    );
    expect(ledger.remove).toHaveBeenCalledWith([
      docIdOf('gone'),
      docIdOf('created'),
      docIdOf('missing'),
    ]);
    expect(result).toEqual({ pruned: { data_view: 3 }, errors: [] });
  });

  it('deletes through the first space the object was last declared in', async () => {
    await run({ owned: stateOf(view('a', ['team-a', 'team-b'])) });

    expect(remove).toHaveBeenCalledWith(expect.objectContaining({ spaceId: 'team-a' }));
  });

  it('groups deletions by kind and space', async () => {
    await run({
      owned: stateOf(view('a', ['team-a']), view('b', ['team-b']), view('c', ['team-a'])),
    });

    expect(remove.mock.calls.map(([{ spaceId, ids }]) => ({ spaceId, ids }))).toEqual([
      { spaceId: 'team-a', ids: ['a', 'c'] },
      { spaceId: 'team-b', ids: ['b'] },
    ]);
  });

  describe('does not delete anything', () => {
    it('when pruning is off', async () => {
      await run({ owned: stateOf(view('gone')), prune: false });

      expect(remove).not.toHaveBeenCalled();
    });

    it('after a run that had any error', async () => {
      await run({ owned: stateOf(view('gone')), status: 'failed' });

      expect(remove).not.toHaveBeenCalled();
    });

    it('when the files declare nothing, so an empty or emptied mount cannot delete everything', async () => {
      await run({ owned: stateOf(view('gone')), input: { hash: 'h', groups: [] } });
      await run({
        owned: stateOf(view('gone')),
        input: { hash: 'h', groups: [{ kind: 'data_view', documents: [] }] },
      });

      expect(remove).not.toHaveBeenCalled();
    });
  });

  it('keeps the entries of a kind that is no longer registered, since nothing can delete them', async () => {
    const orphan: LedgerEntry = { ...view('a'), kind: 'gone_kind' };
    const owned = new Map([['orphan', orphan]]);

    await run({ owned });

    expect(remove).not.toHaveBeenCalled();
    expect(ledger.remove).toHaveBeenCalledWith([]);
  });

  it('keeps the entries of a kind without remove, so its objects stay owned', async () => {
    registry.register({
      id: 'space',
      spaces: 'none',
      parse: (document) => schema.object({ id: schema.string() }).validate(document),
      idOf: ({ id }) => id,
      apply: async () => ({ applied: 0, errors: [] }),
      ownership: { versions: jest.fn() },
    });
    const space: LedgerEntry = { ...view('team', []), kind: 'space' };

    const result = await run({ owned: new Map([[ledgerIdOf('space', 'team'), space]]) });

    expect(remove).not.toHaveBeenCalled();
    expect(ledger.remove).toHaveBeenCalledWith([]);
    expect(result).toEqual({ pruned: {}, errors: [] });
  });

  it('keeps an object owned when deleting it fails, so the next run tries again', async () => {
    remove.mockResolvedValueOnce({ removed: 1, errors: [{ id: 'stuck', message: 'locked' }] });

    const result = await run({ owned: stateOf(view('gone'), view('stuck')) });

    expect(ledger.remove).toHaveBeenCalledWith([docIdOf('gone')]);
    expect(result).toEqual({
      pruned: { data_view: 1 },
      errors: [{ kind: 'data_view', spaceId: 'default', id: 'stuck', message: 'locked' }],
    });
  });

  it('keeps every object of a group owned when the deletion fails without an id or throws', async () => {
    remove.mockResolvedValueOnce({ removed: 0, errors: [{ message: 'one of them failed' }] });
    await run({ owned: stateOf(view('a')) });
    expect(ledger.remove).toHaveBeenLastCalledWith([]);

    remove.mockRejectedValueOnce(new Error('es down'));
    const result = await run({ owned: stateOf(view('a')) });
    expect(ledger.remove).toHaveBeenLastCalledWith([]);
    expect(result.errors).toEqual([{ kind: 'data_view', spaceId: 'default', message: 'es down' }]);
  });

  it('lets a stop through instead of reporting it as a pruning error', async () => {
    const controller = new AbortController();
    remove.mockImplementationOnce(async () => {
      controller.abort();
      throw new Error('aborted');
    });

    await expect(run({ owned: stateOf(view('a')), runSignal: controller.signal })).rejects.toThrow(
      'aborted'
    );
  });

  it('throws when the ledger cannot be written, leaving the outcome to the run', async () => {
    ledger.remove.mockRejectedValueOnce(new Error('ledger down'));

    await expect(run({ owned: stateOf(view('gone')) })).rejects.toThrow('ledger down');
  });
});
