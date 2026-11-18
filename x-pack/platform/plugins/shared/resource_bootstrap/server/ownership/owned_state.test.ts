/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LedgerEntry } from '../../common';
import { isUnchanged, ledgerIdOf, planGroup, readOwnedState } from './owned_state';

const written: LedgerEntry = {
  kind: 'data_view',
  id: 'a',
  spaces: ['default'],
  appliedHash: 'h1',
  objectVersion: 'v1',
  objectUpdatedAt: 't1',
  kibanaVersion: '9.4.0',
};

describe('ledgerIdOf', () => {
  it('keeps one entry per object, apart per kind', () => {
    expect(ledgerIdOf('data_view', 'a')).toBe(ledgerIdOf('data_view', 'a'));
    expect(ledgerIdOf('data_view', 'a')).not.toBe(ledgerIdOf('data_view', 'b'));
    expect(ledgerIdOf('data_view', 'a')).not.toBe(ledgerIdOf('dashboard', 'a'));
  });
});

describe('readOwnedState', () => {
  it('keys every entry by its ledger document id', async () => {
    const ledger = { list: jest.fn(async () => [{ docId: 'doc-a', entry: written }]) };

    expect(await readOwnedState(ledger)).toEqual(new Map([['doc-a', written]]));
  });
});

describe('isUnchanged', () => {
  const sameKibana = { hash: 'h1', kibanaVersion: '9.4.0' };
  const upgraded = { hash: 'h1', kibanaVersion: '9.5.0' };

  it('is true when the declaration and the stored version are as last written', () => {
    expect(
      isUnchanged(written, { ...sameKibana, stored: { version: 'v1', updatedAt: 't1' } })
    ).toBe(true);
  });

  it('is false when the declaration changed', () => {
    expect(
      isUnchanged(written, {
        ...sameKibana,
        hash: 'h2',
        stored: { version: 'v1', updatedAt: 't1' },
      })
    ).toBe(false);
  });

  it('is false when someone wrote the object, even without changing when it was written', () => {
    // Some bulk writes, such as removing references to a deleted object, keep `updated_at`.
    expect(
      isUnchanged(written, { ...sameKibana, stored: { version: 'v2', updatedAt: 't1' } })
    ).toBe(false);
  });

  it('compares when it was written after an upgrade, whose migrations change the version', () => {
    expect(isUnchanged(written, { ...upgraded, stored: { version: 'v9', updatedAt: 't1' } })).toBe(
      true
    );
    expect(isUnchanged(written, { ...upgraded, stored: { version: 'v9', updatedAt: 't2' } })).toBe(
      false
    );
  });

  it('is false whenever something it compares is unknown', () => {
    const stored = { version: 'v1', updatedAt: 't1' };
    const { appliedHash, ...neverWritten } = written;
    const { objectVersion, ...withoutVersion } = written;
    const { objectUpdatedAt, ...withoutUpdatedAt } = written;

    expect(isUnchanged(neverWritten, { ...sameKibana, stored })).toBe(false);
    expect(isUnchanged(withoutVersion, { ...sameKibana, stored })).toBe(false);
    expect(isUnchanged(withoutUpdatedAt, { ...upgraded, stored })).toBe(false);
    expect(isUnchanged(written, { ...upgraded, stored: { version: 'v1' } })).toBe(false);
  });
});

describe('planGroup', () => {
  const hashes = new Map([
    ['unowned-stored', 'h1'],
    ['unowned-missing', 'h1'],
    ['owned-missing', 'h1'],
    ['owned-unchanged', 'h1'],
    ['owned-changed', 'h1'],
  ]);
  const entries: Record<string, LedgerEntry> = {
    'owned-missing': { ...written, id: 'owned-missing' },
    'owned-unchanged': { ...written, id: 'owned-unchanged' },
    'owned-changed': { ...written, id: 'owned-changed' },
  };

  it('sorts each declared id by whether it is owned and what is stored', () => {
    expect(
      planGroup({
        ids: [...hashes.keys()],
        hashes,
        stored: {
          'unowned-stored': { version: 'v1' },
          'owned-unchanged': { version: 'v1', updatedAt: 't1' },
          'owned-changed': { version: 'v2', updatedAt: 't2' },
        },
        entryOf: (id) => entries[id],
        kibanaVersion: '9.4.0',
      })
    ).toEqual({
      notOwned: ['unowned-stored'],
      create: ['unowned-missing'],
      write: ['owned-missing', 'owned-changed'],
      unchanged: ['owned-unchanged'],
    });
  });

  it('writes an object owned before a create that was never confirmed, since its id is owned', () => {
    expect(
      planGroup({
        ids: ['unconfirmed'],
        hashes: new Map([['unconfirmed', 'h1']]),
        stored: { unconfirmed: { version: 'v1' } },
        entryOf: () => ({ kind: 'data_view', id: 'unconfirmed', spaces: ['default'] }),
        kibanaVersion: '9.4.0',
      })
    ).toEqual({ notOwned: [], create: [], write: ['unconfirmed'], unchanged: [] });
  });
});
