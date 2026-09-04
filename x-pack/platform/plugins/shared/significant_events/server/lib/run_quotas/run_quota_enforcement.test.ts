/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { RunQuotaGroup } from '../../../common/run_quotas';
import { consumeRunQuota } from './consume';
import {
  getRunQuotaLedgerId,
  patchRunQuotaSettings,
  readRunQuotaLedger,
  type RunQuotaSavedObjectsRepository,
} from './repository';
import { RUN_QUOTA_LEDGER_SO_TYPE, type RunQuotaLedgerAttributes } from './saved_objects';

interface StoredSavedObject {
  attributes: Record<string, unknown>;
  version: number;
}

const createRepository = () => {
  const documents = new Map<string, StoredSavedObject>();
  const key = (type: string, id: string) => `${type}:${id}`;
  let nextGetError: Error | undefined;
  let nextCreateError: Error | undefined;
  let beforeNextCreate: ((type: string, id: string) => void) | undefined;

  const client = {
    get: async <Attributes>(type: string, id: string) => {
      await Promise.resolve();
      if (nextGetError) {
        const error = nextGetError;
        nextGetError = undefined;
        throw error;
      }
      const document = documents.get(key(type, id));
      if (!document) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      }
      return {
        type,
        id,
        attributes: structuredClone(document.attributes) as Attributes,
        references: [],
        version: String(document.version),
      };
    },
    create: async <Attributes>(
      type: string,
      attributes: Attributes,
      options: { id?: string; overwrite?: boolean } = {}
    ) => {
      await Promise.resolve();
      const id = options.id ?? 'generated';
      const hook = beforeNextCreate;
      beforeNextCreate = undefined;
      hook?.(type, id);
      if (nextCreateError) {
        const error = nextCreateError;
        nextCreateError = undefined;
        throw error;
      }
      const documentKey = key(type, id);
      if (documents.has(documentKey) && !options.overwrite) {
        throw SavedObjectsErrorHelpers.createConflictError(type, id);
      }
      const version = (documents.get(documentKey)?.version ?? 0) + 1;
      documents.set(documentKey, {
        attributes: structuredClone(attributes) as Record<string, unknown>,
        version,
      });
      return {
        type,
        id,
        attributes: structuredClone(attributes),
        references: [],
        version: String(version),
      };
    },
    update: async <Attributes>(
      type: string,
      id: string,
      attributes: Partial<Attributes>,
      options: { version?: string } = {}
    ) => {
      await Promise.resolve();
      const documentKey = key(type, id);
      const current = documents.get(documentKey);
      if (!current) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      }
      if (options.version !== String(current.version)) {
        throw SavedObjectsErrorHelpers.createConflictError(type, id);
      }
      const next = {
        ...current.attributes,
        ...(structuredClone(attributes) as Record<string, unknown>),
      };
      documents.set(documentKey, {
        attributes: next,
        version: current.version + 1,
      });
      return {
        type,
        id,
        attributes: structuredClone(next) as Partial<Attributes>,
        references: [],
        version: String(current.version + 1),
      };
    },
  } as RunQuotaSavedObjectsRepository;

  return {
    client,
    count: async (date: string, group: RunQuotaGroup) =>
      (await readRunQuotaLedger(client, date, group)).count,
    seedLedger: (date: string, group: RunQuotaGroup, count: number) => {
      documents.set(key(RUN_QUOTA_LEDGER_SO_TYPE, getRunQuotaLedgerId(date, group)), {
        attributes: { date, group, count } satisfies RunQuotaLedgerAttributes,
        version: 1,
      });
    },
    failNextGet: (error: Error) => {
      nextGetError = error;
    },
    failNextCreate: (error: Error) => {
      nextCreateError = error;
    },
    onNextCreate: (hook: (type: string, id: string) => void) => {
      beforeNextCreate = hook;
    },
  };
};

describe('run quota admission behavior', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('counts allowed attempts while enforcement is disabled', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-31T12:00:00.000Z'));
    const repository = createRepository();

    await expect(
      consumeRunQuota({ internalRepository: repository.client, group: 'detection' })
    ).resolves.toEqual({ allowed: true });
    await expect(
      consumeRunQuota({ internalRepository: repository.client, group: 'detection' })
    ).resolves.toEqual({ allowed: true });

    await expect(repository.count('2026-08-31', 'detection')).resolves.toBe(2);
  });

  it('does not lose concurrent increments when a limit is unlimited', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-31T12:00:00.000Z'));
    const repository = createRepository();
    await patchRunQuotaSettings(repository.client, {
      enabled: true,
      limits: { ki_extraction: 0 },
    });

    const results = await Promise.all(
      Array.from({ length: 30 }, () =>
        consumeRunQuota({
          internalRepository: repository.client,
          group: 'ki_extraction',
        })
      )
    );

    expect(results).toEqual(Array.from({ length: 30 }, () => ({ allowed: true })));
    await expect(repository.count('2026-08-31', 'ki_extraction')).resolves.toBe(30);
  });

  it('allows below a finite limit and denies at the limit without incrementing', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-31T12:00:00.000Z'));
    const repository = createRepository();
    await patchRunQuotaSettings(repository.client, {
      enabled: true,
      limits: { detection: 2 },
    });

    await expect(
      consumeRunQuota({ internalRepository: repository.client, group: 'detection' })
    ).resolves.toEqual({ allowed: true });
    await expect(
      consumeRunQuota({ internalRepository: repository.client, group: 'detection' })
    ).resolves.toEqual({ allowed: true });
    await expect(
      consumeRunQuota({ internalRepository: repository.client, group: 'detection' })
    ).resolves.toEqual({ allowed: false });

    await expect(repository.count('2026-08-31', 'detection')).resolves.toBe(2);
  });

  it('allows and counts a caller-designated over-limit attempt', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-31T12:00:00.000Z'));
    const repository = createRepository();
    await patchRunQuotaSettings(repository.client, {
      enabled: true,
      limits: { detection: 1 },
    });

    await expect(
      consumeRunQuota({
        internalRepository: repository.client,
        group: 'detection',
      })
    ).resolves.toEqual({ allowed: true });
    await expect(
      consumeRunQuota({
        internalRepository: repository.client,
        group: 'detection',
      })
    ).resolves.toEqual({ allowed: false });
    await expect(
      consumeRunQuota({
        internalRepository: repository.client,
        group: 'detection',
        allowOverLimit: true,
      })
    ).resolves.toEqual({ allowed: true });

    await expect(repository.count('2026-08-31', 'detection')).resolves.toBe(2);
  });

  it('never over-grants concurrent attempts competing for the final slot', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-31T12:00:00.000Z'));
    const repository = createRepository();
    await patchRunQuotaSettings(repository.client, {
      enabled: true,
      limits: { detection: 1 },
    });

    const results = await Promise.all(
      Array.from({ length: 30 }, () =>
        consumeRunQuota({ internalRepository: repository.client, group: 'detection' })
      )
    );

    expect(results.filter(({ allowed }) => allowed)).toHaveLength(1);
    await expect(repository.count('2026-08-31', 'detection')).resolves.toBe(1);
  });

  it('keeps the captured UTC date stable across a conflict retry', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-31T23:59:59.999Z'));
    const repository = createRepository();
    repository.onNextCreate((type, id) => {
      jest.setSystemTime(new Date('2026-09-01T00:00:00.000Z'));
      expect(type).toBe(RUN_QUOTA_LEDGER_SO_TYPE);
      expect(id).toBe(getRunQuotaLedgerId('2026-08-31', 'detection'));
      repository.seedLedger('2026-08-31', 'detection', 0);
    });

    await expect(
      consumeRunQuota({ internalRepository: repository.client, group: 'detection' })
    ).resolves.toEqual({ allowed: true });

    await expect(repository.count('2026-08-31', 'detection')).resolves.toBe(1);
    await expect(repository.count('2026-09-01', 'detection')).resolves.toBe(0);
  });

  it('starts a new ledger after UTC rollover', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-31T23:59:59.999Z'));
    const repository = createRepository();

    await consumeRunQuota({ internalRepository: repository.client, group: 'detection' });
    jest.setSystemTime(new Date('2026-09-01T00:00:00.000Z'));
    await consumeRunQuota({ internalRepository: repository.client, group: 'detection' });

    await expect(repository.count('2026-08-31', 'detection')).resolves.toBe(1);
    await expect(repository.count('2026-09-01', 'detection')).resolves.toBe(1);
  });

  it('increments ledger counts beyond 10,000', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-31T12:00:00.000Z'));
    const repository = createRepository();
    await patchRunQuotaSettings(repository.client, {
      enabled: true,
      limits: { detection: 0 },
    });
    repository.seedLedger('2026-08-31', 'detection', 10_000);

    await expect(
      consumeRunQuota({ internalRepository: repository.client, group: 'detection' })
    ).resolves.toEqual({ allowed: true });
    await expect(repository.count('2026-08-31', 'detection')).resolves.toBe(10_001);
  });

  it('propagates settings reads and ledger write failures', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-31T12:00:00.000Z'));
    const settingsFailure = createRepository();
    settingsFailure.failNextGet(new Error('settings unavailable'));

    await expect(
      consumeRunQuota({ internalRepository: settingsFailure.client, group: 'detection' })
    ).rejects.toThrow('settings unavailable');

    const ledgerFailure = createRepository();
    ledgerFailure.failNextCreate(new Error('ledger unavailable'));
    await expect(
      consumeRunQuota({ internalRepository: ledgerFailure.client, group: 'detection' })
    ).rejects.toThrow('ledger unavailable');
  });
});
