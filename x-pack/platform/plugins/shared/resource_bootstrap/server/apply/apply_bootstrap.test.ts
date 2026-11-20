/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import { loggerMock } from '@kbn/logging-mocks';
import type { LedgerEntry } from '../../common';
import { ledgerIdOf } from '../ownership/owned_state';
import { ResourceKindRegistry } from '../registry/resource_kind_registry';
import type { BootstrapInput } from '../reader/read_bootstrap_files';
import type {
  ApplyResult,
  GlobalApplyContext,
  StoredVersion,
} from '@kbn/resource-bootstrap-server';
import { applyBootstrap } from './apply_bootstrap';

const documentWithId = schema.object({ id: schema.string() }, { unknowns: 'allow' });

/** One kind's documents from one file, each naming `spaces` when given. */
const group = (
  kind: string,
  bodies: unknown[],
  spaces?: string[],
  file = `main.${kind}.json`
): BootstrapInput['groups'][number] => ({
  kind,
  documents: bodies.map((body, index) => ({
    source: `${file} entry ${index + 1}`,
    ...(spaces && { spaces }),
    body: body as never,
  })),
});

/** What a run needs when nothing is owned yet and what it records is not looked at. */
const nothingOwned = {
  owned: new Map(),
  ledger: { put: async () => {}, remove: async () => {} },
  kibanaVersion: '9.4.0',
};

describe('applyBootstrap', () => {
  const logger = loggerMock.create();
  const signal = new AbortController().signal;
  const calls: string[] = [];

  const registerKind = (
    registry: ResourceKindRegistry,
    id: string,
    dependsOn: string[],
    apply: (spaceId?: string) => Promise<ApplyResult> = async () => ({
      applied: 1,
      errors: [],
    }),
    spaces: 'none' | 'isolated' = 'isolated'
  ) =>
    registry.register({
      id,
      dependsOn,
      spaces,
      parse: (document) => documentWithId.validate(document),
      idOf: (resource) => resource.id,
      apply: async (
        context: GlobalApplyContext<TypeOf<typeof documentWithId>> & { spaceId?: string }
      ) => {
        const spaceId = 'spaceId' in context ? context.spaceId : undefined;
        calls.push(`${id}:${spaceId ?? 'no space'}:${context.resources.length}`);
        return apply(spaceId);
      },
    });

  const run = (registry: ResourceKindRegistry, input: BootstrapInput) =>
    applyBootstrap({ input, registry, managed: true, ...nothingOwned, signal, logger });

  beforeEach(() => {
    calls.length = 0;
  });

  it('applies kinds in order, so dependencies are created first', async () => {
    const registry = new ResourceKindRegistry();
    registerKind(registry, 'dashboard', ['data_view']);
    registerKind(registry, 'data_view', []);

    const outcome = await run(registry, {
      hash: 'h',
      groups: [group('dashboard', [{ id: 'a' }]), group('data_view', [{ id: 'a' }])],
    });

    expect(calls).toEqual(['data_view:default:1', 'dashboard:default:1']);
    expect(outcome.status).toBe('completed');
    expect(outcome.kinds).toEqual({
      data_view: { applied: 1, created: 0, unchanged: 0, failed: 0 },
      dashboard: { applied: 1, created: 0, unchanged: 0, failed: 0 },
    });
  });

  it('fails before applying anything when a file names an unregistered kind', async () => {
    const registry = new ResourceKindRegistry();
    registerKind(registry, 'data_view', []);

    const outcome = await run(registry, {
      hash: 'h',
      groups: [group('data_view', [{ id: 'a' }]), group('mystery', [{ id: 'a' }])],
    });

    expect(calls).toEqual([]);
    expect(outcome.status).toBe('failed');
    expect(outcome.errors).toEqual([
      { kind: 'mystery', message: 'No resource kind "mystery" is registered' },
    ]);
  });

  describe('a space that does not exist', () => {
    const runWith = (
      registry: ResourceKindRegistry,
      input: BootstrapInput,
      spaceExists: jest.Mock
    ) => {
      const warnLogger = loggerMock.create();
      return {
        logger: warnLogger,
        outcome: applyBootstrap({
          input,
          registry,
          managed: true,
          ...nothingOwned,
          signal,
          logger: warnLogger,
          spaceExists,
        }),
      };
    };

    it('is warned about once, for every isolated kind, and the resources are still applied', async () => {
      const registry = new ResourceKindRegistry();
      registerKind(registry, 'data_view', []);
      registerKind(registry, 'dashboard', ['data_view']);
      const spaceExists = jest.fn(async (spaceId: string) => spaceId !== 'typo');

      const { logger: warnLogger, outcome } = runWith(
        registry,
        {
          hash: 'h',
          groups: [
            group('data_view', [{ id: 'a' }], ['typo']),
            group('dashboard', [{ id: 'b' }], ['typo']),
            group('dashboard', [{ id: 'c' }], ['team-a']),
          ],
        },
        spaceExists
      );

      expect((await outcome).status).toBe('completed');
      expect(calls).toEqual(['data_view:typo:1', 'dashboard:typo:1', 'dashboard:team-a:1']);
      expect(spaceExists.mock.calls).toEqual([['typo'], ['team-a']]);
      expect(warnLogger.warn).toHaveBeenCalledTimes(1);
      expect(warnLogger.warn).toHaveBeenCalledWith(expect.stringContaining('"typo"'));
    });

    it('is checked after the kinds before it ran, so a space the files create is not reported', async () => {
      const registry = new ResourceKindRegistry();
      const created = new Set<string>();
      registerKind(
        registry,
        'space',
        [],
        async () => {
          created.add('team-a');
          return { applied: 1, errors: [] };
        },
        'none'
      );
      registerKind(registry, 'data_view', []);
      const spaceExists = jest.fn(async (spaceId: string) => created.has(spaceId));

      const { logger: warnLogger, outcome } = runWith(
        registry,
        {
          hash: 'h',
          groups: [
            group('space', [{ id: 'team-a' }]),
            group('data_view', [{ id: 'a' }], ['team-a']),
          ],
        },
        spaceExists
      );

      await outcome;
      expect(spaceExists).toHaveBeenCalledTimes(1);
      expect(spaceExists).toHaveBeenCalledWith('team-a');
      expect(warnLogger.warn).not.toHaveBeenCalled();
    });

    it('is not warned about when the lookup cannot tell', async () => {
      const registry = new ResourceKindRegistry();
      registerKind(registry, 'data_view', []);

      const { logger: warnLogger, outcome } = runWith(
        registry,
        { hash: 'h', groups: [group('data_view', [{ id: 'a' }], ['team-a'])] },
        jest.fn().mockResolvedValue(undefined)
      );

      await outcome;
      expect(warnLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('spaces', () => {
    it('applies an isolated kind once for each space its documents name, and to the default space otherwise', async () => {
      const registry = new ResourceKindRegistry();
      registerKind(registry, 'data_view', []);

      const outcome = await run(registry, {
        hash: 'h',
        groups: [
          group('data_view', [{ id: 'a' }], ['team-a']),
          group('data_view', [{ id: 'b' }], ['team-b']),
          group('data_view', [{ id: 'c' }]),
          group('data_view', [{ id: 'd' }], ['team-a']),
        ],
      });

      expect(calls).toEqual(['data_view:team-a:2', 'data_view:team-b:1', 'data_view:default:1']);
      expect(outcome.kinds.data_view.applied).toBe(3);
    });

    it('applies a shared kind once for each set of spaces, owned in the first one', async () => {
      const registry = new ResourceKindRegistry();
      const apply = jest.fn(async () => ({ applied: 1, errors: [] }));
      registry.register({
        id: 'data_view',
        spaces: 'shared',
        parse: (document) => documentWithId.validate(document),
        idOf: ({ id }) => id,
        apply,
      });

      await run(registry, {
        hash: 'h',
        groups: [
          group('data_view', [{ id: 'a' }], ['team-a', 'team-b']),
          group('data_view', [{ id: 'b' }]),
          group('data_view', [{ id: 'c' }], ['team-a', 'team-b']),
        ],
      });

      expect(apply).toHaveBeenCalledTimes(2);
      expect(apply).toHaveBeenCalledWith(
        expect.objectContaining({
          spaceId: 'team-a',
          spaces: ['team-a', 'team-b'],
          resources: [{ id: 'a' }, { id: 'c' }],
        })
      );
      expect(apply).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'default', spaces: ['default'] })
      );
    });

    it('fails before applying anything when a document of an isolated kind names several spaces', async () => {
      const registry = new ResourceKindRegistry();
      registerKind(registry, 'data_view', []);

      const outcome = await run(registry, {
        hash: 'h',
        groups: [group('data_view', [{ id: 'a' }], ['team-a', 'team-b'])],
      });

      expect(calls).toEqual([]);
      expect(outcome.status).toBe('failed');
      expect(outcome.retryable).toBe(false);
      expect(outcome.errors).toEqual([
        expect.objectContaining({
          kind: 'data_view',
          message: expect.stringContaining('one space'),
        }),
      ]);
    });

    describe('one object declared for different spaces', () => {
      const registerOwned = (
        registry: ResourceKindRegistry,
        id: string,
        spaces: 'isolated' | 'shared'
      ) =>
        registry.register({
          id,
          spaces,
          parse: (document) => schema.object({ id: schema.string() }).validate(document),
          idOf: (resource) => resource.id,
          apply: async ({ spaceId, resources }) => {
            calls.push(`${id}:${spaceId}:${resources.length}`);
            return { applied: resources.length, errors: [] };
          },
          ownership: {
            versions: async () => ({}),
            remove: async () => ({ removed: 0, errors: [] }),
          },
        });

      it('fails before applying anything when a shared kind declares it for two sets of spaces', async () => {
        const registry = new ResourceKindRegistry();
        registerOwned(registry, 'data_view', 'shared');

        const outcome = await run(registry, {
          hash: 'h',
          groups: [
            group('data_view', [{ id: 'a' }], ['team-a', 'team-b']),
            group('data_view', [{ id: 'a' }], ['team-c']),
          ],
        });

        expect(calls).toEqual([]);
        expect(outcome.status).toBe('failed');
        expect(outcome.retryable).toBe(false);
        expect(outcome.errors).toEqual([
          {
            kind: 'data_view',
            spaceId: 'team-a',
            id: 'a',
            message:
              'The data_view "a" is declared for different spaces ([team-a, team-b] and [team-c]), so each apply would undo the other; declare it once',
          },
        ]);
      });

      it('fails for a shared kind without ownership too, whichever space comes first', async () => {
        const registry = new ResourceKindRegistry();
        registry.register({
          id: 'data_view',
          spaces: 'shared',
          parse: (document) => documentWithId.validate(document),
          idOf: ({ id }) => id,
          apply: async ({ spaceId, resources }) => {
            calls.push(`data_view:${spaceId}:${resources.length}`);
            return { applied: resources.length, errors: [] };
          },
        });

        const outcome = await run(registry, {
          hash: 'h',
          groups: [
            group('data_view', [{ id: 'a' }], ['team-a', 'team-b']),
            group('data_view', [{ id: 'a' }], ['team-b']),
          ],
        });

        expect(calls).toEqual([]);
        expect(outcome.status).toBe('failed');
        expect(outcome.errors).toEqual([
          expect.objectContaining({ kind: 'data_view', spaceId: 'team-a', id: 'a' }),
        ]);
      });

      it('fails when an isolated kind declares an object that is unique across spaces in two', async () => {
        const registry = new ResourceKindRegistry();
        registerOwned(registry, 'dashboard', 'isolated');

        const outcome = await run(registry, {
          hash: 'h',
          groups: [
            group('dashboard', [{ id: 'a' }], ['team-a']),
            group('dashboard', [{ id: 'a' }], ['team-b']),
          ],
        });

        expect(calls).toEqual([]);
        expect(outcome.errors).toEqual([
          expect.objectContaining({ kind: 'dashboard', id: 'a', spaceId: 'team-a' }),
        ]);
      });

      it('applies no declaration of an id that two files declare for the same spaces', async () => {
        const registry = new ResourceKindRegistry();
        registerOwned(registry, 'data_view', 'shared');

        const outcome = await run(registry, {
          hash: 'h',
          groups: [
            group('data_view', [{ id: 'a' }, { id: 'b' }], ['team-a'], 'one.data_view.json'),
            group('data_view', [{ id: 'a' }], ['team-a'], 'two.data_view.json'),
          ],
        });

        expect(calls).toEqual(['data_view:team-a:1']);
        expect(outcome.status).toBe('failed');
        expect(outcome.retryable).toBe(false);
        expect(outcome.kinds.data_view).toMatchObject({ applied: 1, failed: 2 });
        const declaredIn = 'is declared in one.data_view.json entry 1, two.data_view.json entry 1';
        expect(outcome.errors).toEqual([
          expect.objectContaining({
            kind: 'data_view',
            spaceId: 'team-a',
            id: 'a',
            message: expect.stringMatching(
              /^Invalid data_view resource in one\.data_view\.json entry 1: /
            ),
          }),
          expect.objectContaining({
            kind: 'data_view',
            spaceId: 'team-a',
            id: 'a',
            message: expect.stringMatching(
              /^Invalid data_view resource in two\.data_view\.json entry 1: /
            ),
          }),
        ]);
        outcome.errors.forEach(({ message }) => expect(message).toContain(declaredIn));
      });

      it('applies the same id in two spaces for a kind without ownership', async () => {
        const registry = new ResourceKindRegistry();
        registerKind(registry, 'widget', []);

        const outcome = await run(registry, {
          hash: 'h',
          groups: [
            group('widget', [{ id: 'a' }], ['team-a']),
            group('widget', [{ id: 'a' }], ['team-b']),
          ],
        });

        expect(calls).toEqual(['widget:team-a:1', 'widget:team-b:1']);
        expect(outcome.status).toBe('completed');
      });
    });

    it('hands the kind documents without the spaces field', async () => {
      const registry = new ResourceKindRegistry();
      const seen: unknown[] = [];
      registry.register({
        id: 'data_view',
        spaces: 'isolated',
        parse: (document) => documentWithId.validate(document),
        idOf: ({ id }) => id,
        apply: async ({ resources }) => {
          seen.push(...resources);
          return { applied: resources.length, errors: [] };
        },
      });

      await run(registry, { hash: 'h', groups: [group('data_view', [{ id: 'a' }], ['x'])] });

      expect(seen).toEqual([{ id: 'a' }]);
    });

    it('applies a kind without space support once, for no space', async () => {
      const registry = new ResourceKindRegistry();
      registerKind(registry, 'space', [], undefined, 'none');

      await run(registry, { hash: 'h', groups: [group('space', [{ id: 'a' }, { id: 'b' }])] });

      expect(calls).toEqual(['space:no space:2']);
    });

    it('fails before applying anything when a kind without space support names spaces', async () => {
      const registry = new ResourceKindRegistry();
      registerKind(registry, 'space', [], undefined, 'none');
      registerKind(registry, 'data_view', []);

      const outcome = await run(registry, {
        hash: 'h',
        groups: [group('space', [{ id: 'a' }], ['team-a']), group('data_view', [{ id: 'b' }])],
      });

      expect(calls).toEqual([]);
      expect(outcome.status).toBe('failed');
      expect(outcome.retryable).toBe(false);
      expect(outcome.errors).toEqual([
        expect.objectContaining({
          kind: 'space',
          message: expect.stringContaining('"spaces"'),
        }),
      ]);
    });

    it('applies nothing for a kind whose files are empty', async () => {
      const registry = new ResourceKindRegistry();
      registerKind(registry, 'data_view', []);

      const outcome = await run(registry, { hash: 'h', groups: [group('data_view', [])] });

      expect(calls).toEqual([]);
      expect(outcome.status).toBe('completed');
    });
  });

  describe('retryable', () => {
    const groups = (documents: unknown[]): BootstrapInput['groups'] => [
      group('data_view', documents as never),
    ];

    it('is false for an unregistered kind', async () => {
      const registry = new ResourceKindRegistry();

      const outcome = await run(registry, {
        hash: 'h',
        groups: [group('mystery', [{ id: 'a' }])],
      });

      expect(outcome.retryable).toBe(false);
    });

    it('is false when the only errors are documents that fail validation', async () => {
      const registry = new ResourceKindRegistry();
      registerKind(registry, 'data_view', []);

      const outcome = await run(registry, { hash: 'h', groups: groups([{ id: 'a' }, 7]) });

      expect(outcome.status).toBe('failed');
      expect(outcome.retryable).toBe(false);
    });

    it('is true when a resource failed to apply, even next to invalid documents', async () => {
      const registry = new ResourceKindRegistry();
      registerKind(registry, 'data_view', [], async () => ({
        applied: 0,
        errors: [{ id: 'bad', message: 'rejected' }],
      }));

      const outcome = await run(registry, { hash: 'h', groups: groups([{ id: 'a' }, 7]) });

      expect(outcome.retryable).toBe(true);
    });

    it('is false when the only errors are ones the kind marks permanent', async () => {
      const registry = new ResourceKindRegistry();
      registerKind(registry, 'data_view', [], async () => ({
        applied: 0,
        errors: [{ id: 'taken', message: 'the name is taken', permanent: true }],
      }));

      const outcome = await run(registry, { hash: 'h', groups: groups([{ id: 'a' }]) });

      expect(outcome.status).toBe('failed');
      expect(outcome.retryable).toBe(false);
      // The flag only decides the retry; the status does not store it.
      expect(outcome.errors).toEqual([
        { kind: 'data_view', spaceId: 'default', id: 'taken', message: 'the name is taken' },
      ]);
    });

    it('is true when a permanent error comes with one that may be transient', async () => {
      const registry = new ResourceKindRegistry();
      registerKind(registry, 'data_view', [], async () => ({
        applied: 0,
        errors: [
          { id: 'taken', message: 'the name is taken', permanent: true },
          { id: 'other', message: 'elasticsearch is down' },
        ],
      }));

      const outcome = await run(registry, { hash: 'h', groups: groups([{ id: 'a' }]) });

      expect(outcome.retryable).toBe(true);
    });

    it('is true when a group throws', async () => {
      const registry = new ResourceKindRegistry();
      registerKind(registry, 'data_view', [], async () => {
        throw new Error('boom');
      });

      const outcome = await run(registry, { hash: 'h', groups: groups([{ id: 'a' }]) });

      expect(outcome.retryable).toBe(true);
    });

    it('is true for a run without errors', async () => {
      const registry = new ResourceKindRegistry();
      registerKind(registry, 'data_view', []);

      const outcome = await run(registry, { hash: 'h', groups: groups([{ id: 'a' }]) });

      expect(outcome.retryable).toBe(true);
    });
  });

  it('keeps going after a group throws and reports it', async () => {
    const registry = new ResourceKindRegistry();
    registerKind(registry, 'data_view', [], async (spaceId) => {
      if (spaceId === 'broken') {
        throw new Error('boom');
      }
      return { applied: 1, errors: [] };
    });

    const outcome = await run(registry, {
      hash: 'h',
      groups: [
        group('data_view', [{ id: 'a' }, { id: 'b' }], ['broken']),
        group('data_view', [{ id: 'a' }]),
      ],
    });

    expect(calls).toEqual(['data_view:broken:2', 'data_view:default:1']);
    expect(outcome.status).toBe('failed');
    expect(outcome.kinds.data_view).toEqual({ applied: 1, created: 0, unchanged: 0, failed: 2 });
    expect(outcome.errors).toEqual([{ kind: 'data_view', spaceId: 'broken', message: 'boom' }]);
  });

  it('reports per-resource errors with the kind and space they belong to', async () => {
    const registry = new ResourceKindRegistry();
    registerKind(registry, 'data_view', [], async () => ({
      applied: 1,
      errors: [{ id: 'bad', message: 'rejected' }],
    }));

    const outcome = await run(registry, {
      hash: 'h',
      groups: [group('data_view', [{ id: 'a' }, { id: 'b' }])],
    });

    expect(outcome.errors).toEqual([
      { kind: 'data_view', spaceId: 'default', id: 'bad', message: 'rejected' },
    ]);
    expect(outcome.kinds.data_view).toEqual({ applied: 1, created: 0, unchanged: 0, failed: 1 });
  });

  it('stops when the task is aborted', async () => {
    const registry = new ResourceKindRegistry();
    registerKind(registry, 'data_view', []);
    const controller = new AbortController();
    controller.abort();

    await expect(
      applyBootstrap({
        input: { hash: 'h', groups: [group('data_view', [{ id: 'a' }])] },
        registry,
        managed: true,
        ...nothingOwned,
        signal: controller.signal,
        logger,
      })
    ).rejects.toThrow(/aborted/);
  });

  describe('when the run is aborted', () => {
    const groups = [group('data_view', [{ id: 'a' }])];

    it('lets the abort reach the caller, not recording the group as failed', async () => {
      const registry = new ResourceKindRegistry();
      const controller = new AbortController();
      registerKind(registry, 'data_view', [], async () => {
        controller.abort();
        throw new Error('stopped');
      });

      await expect(
        applyBootstrap({
          input: { hash: 'h', groups },
          registry,
          managed: true,
          ...nothingOwned,
          signal: controller.signal,
          logger,
        })
      ).rejects.toThrow('stopped');
    });

    it('does not report completed when the last group was cut short without throwing', async () => {
      const registry = new ResourceKindRegistry();
      const controller = new AbortController();
      registerKind(registry, 'data_view', [], async () => {
        controller.abort();
        return { applied: 0, errors: [] };
      });

      await expect(
        applyBootstrap({
          input: { hash: 'h', groups },
          registry,
          managed: true,
          ...nothingOwned,
          signal: controller.signal,
          logger,
        })
      ).rejects.toThrow(/aborted/);
    });
  });

  describe('ownership', () => {
    const KIBANA_VERSION = '9.4.0';
    const docIdOf = (id: string) => ledgerIdOf('data_view', id);

    /** An in-memory ledger; `owned` is what a run reads when it starts. */
    const createLedger = (events: string[] = []) => {
      const entries = new Map<string, LedgerEntry>();
      const put = jest.fn(async (items: Array<{ docId: string; entry: LedgerEntry }>) => {
        events.push(`own:${items.map(({ entry }) => entry.id).join(',')}`);
        items.forEach(({ docId, entry }) => entries.set(docId, entry));
      });
      const remove = jest.fn(async (docIds: string[]) => {
        docIds.forEach((docId) => entries.delete(docId));
      });
      return { entries, put, remove, owned: () => new Map(entries) };
    };

    /**
     * A data view kind whose objects live in `stored`; each write gives an object a new version,
     * written at a time named after it.
     */
    const ownedRegistry = ({
      stored,
      events = [],
      versions = jest.fn(async ({ ids }: { ids: string[] }) =>
        Object.fromEntries(ids.flatMap((id) => (stored[id] ? [[id, stored[id]]] : [])))
      ),
      apply,
    }: {
      stored: Record<string, StoredVersion>;
      events?: string[];
      versions?: jest.Mock;
      apply?: (context: { resources: Array<{ id: string }> }) => Promise<ApplyResult>;
    }) => {
      let writes = 0;
      const registry = new ResourceKindRegistry();
      registry.register({
        id: 'data_view',
        spaces: 'isolated',
        parse: (document) => documentWithId.validate(document),
        idOf: ({ id }) => id,
        apply: async (context) => {
          events.push(`apply:${context.resources.map(({ id }) => id).join(',')}`);
          if (apply) {
            return apply(context);
          }
          context.resources.forEach(({ id }) => {
            writes++;
            stored[id] = { version: `v${writes}`, updatedAt: `t${writes}` };
          });
          return { applied: context.resources.length, errors: [] };
        },
        ownership: { versions, remove: async () => ({ removed: 0, errors: [] }) },
      });
      return { registry, versions };
    };

    const declaredViews: BootstrapInput = {
      hash: 'h',
      groups: [group('data_view', [{ id: 'old' }, { id: 'new' }])],
    };

    const runOwned = ({
      registry,
      ledger,
      input = declaredViews,
      kibanaVersion = KIBANA_VERSION,
      runLogger = logger,
    }: {
      registry: ResourceKindRegistry;
      ledger: ReturnType<typeof createLedger>;
      input?: BootstrapInput;
      kibanaVersion?: string;
      runLogger?: typeof logger;
    }) =>
      applyBootstrap({
        input,
        registry,
        managed: true,
        owned: ledger.owned(),
        ledger,
        kibanaVersion,
        signal,
        logger: runLogger,
      });

    describe('an object that is neither owned nor stored', () => {
      it('is owned before it is created, then recorded with what was written', async () => {
        const events: string[] = [];
        const stored: Record<string, StoredVersion> = {};
        const { registry } = ownedRegistry({ stored, events });
        const ledger = createLedger(events);

        const outcome = await runOwned({ registry, ledger });

        expect(events).toEqual(['own:old,new', 'apply:old,new', 'own:old,new']);
        expect(ledger.put.mock.calls[0][0]).toEqual([
          { docId: docIdOf('old'), entry: { kind: 'data_view', id: 'old', spaces: ['default'] } },
          { docId: docIdOf('new'), entry: { kind: 'data_view', id: 'new', spaces: ['default'] } },
        ]);
        expect(ledger.entries.get(docIdOf('old'))).toEqual({
          kind: 'data_view',
          id: 'old',
          spaces: ['default'],
          appliedHash: expect.stringMatching(/^[0-9a-f]{64}$/),
          objectVersion: 'v1',
          objectUpdatedAt: 't1',
          kibanaVersion: KIBANA_VERSION,
        });
        expect(outcome.kinds.data_view).toEqual({
          applied: 2,
          created: 2,
          unchanged: 0,
          failed: 0,
        });
      });

      it('stays owned when the apply fails after creating it, so the next run finishes it', async () => {
        const stored: Record<string, StoredVersion> = {};
        const { registry } = ownedRegistry({
          stored,
          apply: async () => {
            stored.old = { version: 'v1' };
            throw new Error('failed after creating');
          },
        });
        const ledger = createLedger();

        const outcome = await runOwned({ registry, ledger });

        expect([...ledger.entries.values()]).toEqual([
          { kind: 'data_view', id: 'old', spaces: ['default'] },
        ]);
        expect(outcome.status).toBe('failed');
        expect(outcome.retryable).toBe(true);
      });

      it('is given up when the apply fails before creating anything', async () => {
        const { registry } = ownedRegistry({
          stored: {},
          apply: async () => {
            throw new Error('services unavailable');
          },
        });
        const ledger = createLedger();

        const outcome = await runOwned({ registry, ledger });

        expect(ledger.remove).toHaveBeenCalledWith([docIdOf('old'), docIdOf('new')]);
        expect(ledger.entries.size).toBe(0);
        expect(outcome.status).toBe('failed');
        expect(outcome.retryable).toBe(true);
        expect(outcome.errors).toEqual([
          { kind: 'data_view', spaceId: 'default', message: 'services unavailable' },
        ]);
      });

      it('stays owned when the apply fails and the objects cannot be read after', async () => {
        const versions = jest
          .fn()
          .mockResolvedValueOnce({})
          .mockRejectedValueOnce(new Error('es down'));
        const { registry } = ownedRegistry({
          stored: {},
          versions,
          apply: async () => {
            throw new Error('services unavailable');
          },
        });
        const ledger = createLedger();

        await runOwned({ registry, ledger });

        expect(ledger.entries.size).toBe(2);
      });

      it('stays owned when the run is aborted during the apply', async () => {
        const controller = new AbortController();
        const { registry, versions } = ownedRegistry({
          stored: {},
          apply: async () => {
            controller.abort();
            throw new Error('stopped');
          },
        });
        const ledger = createLedger();

        await expect(
          applyBootstrap({
            input: declaredViews,
            registry,
            managed: true,
            owned: ledger.owned(),
            ledger,
            kibanaVersion: KIBANA_VERSION,
            signal: controller.signal,
            logger,
          })
        ).rejects.toThrow('stopped');

        // Writes may still be in flight, so what is stored cannot tell what was created.
        expect(versions).toHaveBeenCalledTimes(1);
        expect(ledger.entries.size).toBe(2);
      });

      it('is given up when its create failed and nothing was created', async () => {
        const { registry } = ownedRegistry({
          stored: {},
          apply: async ({ resources }) => ({
            applied: 0,
            errors: resources.map(({ id }) => ({ id, message: 'conflict', permanent: true })),
          }),
        });
        const ledger = createLedger();

        const outcome = await runOwned({ registry, ledger });

        // A space-isolated object in another space is missing here, so its create conflicts.
        expect(ledger.remove).toHaveBeenCalledWith([docIdOf('old'), docIdOf('new')]);
        expect(ledger.entries.size).toBe(0);
        expect(outcome.kinds.data_view).toMatchObject({ applied: 0, failed: 2 });
      });

      it('stays owned when its create failed after creating it', async () => {
        const stored: Record<string, StoredVersion> = {};
        const { registry } = ownedRegistry({
          stored,
          apply: async () => {
            stored.new = { version: 'v1' };
            return {
              applied: 0,
              errors: [
                { id: 'old', message: 'rejected' },
                { id: 'new', message: 'failed after creating' },
              ],
            };
          },
        });
        const ledger = createLedger();

        await runOwned({ registry, ledger });

        expect([...ledger.entries.values()]).toEqual([
          { kind: 'data_view', id: 'new', spaces: ['default'] },
        ]);
      });

      it('is given up when its create was refused as a conflict, though an object with its id exists', async () => {
        const stored: Record<string, StoredVersion> = {};
        const { registry } = ownedRegistry({
          stored,
          apply: async () => {
            // Created by someone else between the read and the create.
            stored.new = { version: 'v1' };
            return {
              applied: 1,
              errors: [{ id: 'new', message: 'conflict', conflict: true }],
            };
          },
        });
        const ledger = createLedger();

        await runOwned({ registry, ledger });

        expect(ledger.entries.has(docIdOf('new'))).toBe(false);
        expect(ledger.entries.get(docIdOf('old'))).toMatchObject({
          appliedHash: expect.any(String),
        });
      });

      it('is given up when its create was refused as a conflict and the objects cannot be read after', async () => {
        const versions = jest
          .fn()
          .mockResolvedValueOnce({})
          .mockRejectedValueOnce(new Error('es down'));
        const { registry } = ownedRegistry({
          stored: {},
          versions,
          apply: async () => ({
            applied: 0,
            errors: [{ id: 'new', message: 'conflict', conflict: true }],
          }),
        });
        const ledger = createLedger();

        await runOwned({ registry, ledger });

        expect(ledger.entries.has(docIdOf('new'))).toBe(false);
      });

      it('stays owned when its create failed and the objects cannot be read after', async () => {
        const versions = jest
          .fn()
          .mockResolvedValueOnce({})
          .mockRejectedValueOnce(new Error('es down'));
        const { registry } = ownedRegistry({
          stored: {},
          versions,
          apply: async () => ({ applied: 0, errors: [{ id: 'new', message: 'conflict' }] }),
        });
        const ledger = createLedger();

        await runOwned({ registry, ledger });

        expect(ledger.remove).not.toHaveBeenCalledWith(expect.arrayContaining([docIdOf('new')]));
        expect(ledger.entries.has(docIdOf('new'))).toBe(true);
      });

      it('is given up by a later run when its create was never recorded and fails again', async () => {
        const { registry } = ownedRegistry({
          stored: {},
          apply: async ({ resources }) => ({
            applied: 0,
            errors: resources.map(({ id }) => ({ id, message: 'conflict', permanent: true })),
          }),
        });
        const ledger = createLedger();
        // Owned before a create whose outcome could not be read, next to one written before.
        ledger.entries.set(docIdOf('new'), { kind: 'data_view', id: 'new', spaces: ['default'] });
        ledger.entries.set(docIdOf('old'), {
          kind: 'data_view',
          id: 'old',
          spaces: ['default'],
          appliedHash: 'h',
        });

        await runOwned({ registry, ledger });

        expect(ledger.remove).toHaveBeenCalledWith([docIdOf('new')]);
        expect([...ledger.entries.keys()]).toEqual([docIdOf('old')]);
      });

      it('stays owned by a later run when its create was never recorded and its update conflicts', async () => {
        const { registry } = ownedRegistry({
          stored: { new: { version: 'v1' } },
          apply: async () => ({
            applied: 1,
            // Edited by someone else between the read and the update.
            errors: [{ id: 'new', message: 'conflict', conflict: true }],
          }),
        });
        const ledger = createLedger();
        // Owned before a create that happened but whose write was never recorded.
        ledger.entries.set(docIdOf('new'), { kind: 'data_view', id: 'new', spaces: ['default'] });

        await runOwned({ registry, ledger });

        expect(ledger.remove).not.toHaveBeenCalledWith(expect.arrayContaining([docIdOf('new')]));
        expect(ledger.entries.get(docIdOf('new'))).toEqual({
          kind: 'data_view',
          id: 'new',
          spaces: ['default'],
        });
      });

      it('is not created when it cannot be owned first', async () => {
        const events: string[] = [];
        const { registry } = ownedRegistry({ stored: {}, events });
        const ledger = createLedger();
        ledger.put.mockRejectedValueOnce(new Error('ledger down'));

        const outcome = await runOwned({ registry, ledger });

        expect(events).toEqual([]);
        expect(outcome.errors).toEqual([
          { kind: 'data_view', spaceId: 'default', message: 'ledger down' },
        ]);
        expect(outcome.retryable).toBe(true);
      });
    });

    it('never takes over an object that exists but that the bootstrap did not create', async () => {
      const events: string[] = [];
      const { registry } = ownedRegistry({ stored: { old: { version: 'mine' } }, events });
      const ledger = createLedger();

      const outcome = await runOwned({ registry, ledger });

      expect(events).toEqual(['apply:new']);
      expect(ledger.entries.has(docIdOf('old'))).toBe(false);
      expect(outcome.errors).toEqual([
        {
          kind: 'data_view',
          spaceId: 'default',
          id: 'old',
          message:
            'The data_view "old" already exists and the bootstrap did not create it, so it is not applied. Delete it, or declare it with another id',
        },
      ]);
      // Only a person can delete it, so a retry would not help.
      expect(outcome.retryable).toBe(false);
      expect(outcome.kinds.data_view).toEqual({ applied: 1, created: 1, unchanged: 0, failed: 1 });
    });

    describe('an object the bootstrap owns', () => {
      /** Runs once so both objects are owned, then returns what the next run needs. */
      const ownBoth = async () => {
        const events: string[] = [];
        const stored: Record<string, StoredVersion> = {};
        const { registry, versions } = ownedRegistry({ stored, events });
        const ledger = createLedger();
        await runOwned({ registry, ledger });
        events.length = 0;
        return { events, stored, registry, versions, ledger };
      };

      it('is left as it is when neither its declaration nor the object changed', async () => {
        const { events, registry, ledger } = await ownBoth();

        const outcome = await runOwned({ registry, ledger });

        expect(events).toEqual([]);
        expect(outcome.kinds.data_view).toEqual({
          applied: 0,
          created: 0,
          unchanged: 2,
          failed: 0,
        });
      });

      it('is written again when someone changed it, reverting the change', async () => {
        const { events, stored, registry, ledger } = await ownBoth();
        stored.old = { version: 'edited', updatedAt: 'edited' };

        const outcome = await runOwned({ registry, ledger });

        expect(events).toEqual(['apply:old']);
        expect(ledger.entries.get(docIdOf('old'))).toMatchObject({ objectVersion: 'v3' });
        expect(outcome.kinds.data_view).toEqual({
          applied: 1,
          created: 0,
          unchanged: 1,
          failed: 0,
        });
      });

      it('is written again when its declaration changed', async () => {
        const { events, registry, ledger } = await ownBoth();

        await runOwned({
          registry,
          ledger,
          input: { hash: 'h2', groups: [group('data_view', [{ id: 'old', title: 'renamed' }])] },
        });

        expect(events).toEqual(['apply:old']);
      });

      it('is created again when it is gone', async () => {
        const { events, stored, registry, ledger } = await ownBoth();
        delete stored.old;

        const outcome = await runOwned({ registry, ledger });

        expect(events).toEqual(['apply:old']);
        expect(outcome.kinds.data_view).toEqual({
          applied: 1,
          created: 1,
          unchanged: 1,
          failed: 0,
        });
      });

      it('is written again when what was written could not be read back', async () => {
        const { events, registry, versions, ledger } = await ownBoth();
        const warnLogger = loggerMock.create();
        versions.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('es down'));
        ledger.entries.clear();

        // Owned afresh, but the versions after the write cannot be read.
        const first = await runOwned({ registry, ledger, runLogger: warnLogger });
        expect(first.status).toBe('completed');
        expect(ledger.entries.get(docIdOf('old'))).not.toHaveProperty('objectVersion');
        expect(warnLogger.warn).toHaveBeenCalledWith(expect.stringContaining('es down'));
        events.length = 0;

        await runOwned({ registry, ledger });

        expect(events).toEqual(['apply:old,new']);
      });
    });

    describe('an owned object of an isolated kind whose declaration moved to another space', () => {
      const docId = ledgerIdOf('dashboard', 'overview');
      const inSpace = (spaces?: string[]): BootstrapInput => ({
        hash: spaces?.join(',') ?? 'default',
        groups: [group('dashboard', [{ id: 'overview' }], spaces)],
      });

      /**
       * A dashboard-like kind: an id is unique across spaces but is looked up only in the declared
       * space, so creating it while it is in another space conflicts.
       */
      const isolatedRegistry = (remove?: jest.Mock) => {
        const events: string[] = [];
        const spaceOf = new Map<string, string | undefined>();
        let writes = 0;
        const removeMock =
          remove ??
          jest.fn(async ({ spaceId, ids }: { spaceId: string; ids: string[] }) => {
            ids.filter((id) => spaceOf.get(id) === spaceId).forEach((id) => spaceOf.delete(id));
            return { removed: ids.length, errors: [] };
          });
        const registry = new ResourceKindRegistry();
        registry.register({
          id: 'dashboard',
          spaces: 'isolated',
          parse: (document) => documentWithId.validate(document),
          idOf: ({ id }) => id,
          apply: async ({ spaceId, resources }) => {
            events.push(`apply:${spaceId}:${resources.map(({ id }) => id).join(',')}`);
            const errors = resources.flatMap(({ id }) => {
              const current = spaceOf.get(id);
              if (current !== undefined && current !== spaceId) {
                return [{ id, message: `conflict with "${current}"`, conflict: true }];
              }
              spaceOf.set(id, spaceId);
              writes++;
              return [];
            });
            return { applied: resources.length - errors.length, errors };
          },
          ownership: {
            versions: async ({ spaceId, ids }) =>
              Object.fromEntries(
                ids
                  .filter((id) => spaceOf.get(id) === spaceId)
                  .map((id) => [id, { version: `v${writes}` }])
              ),
            remove: async (context) => {
              events.push(`remove:${context.spaceId}:${context.ids.join(',')}`);
              return removeMock(context);
            },
          },
        });
        return { registry, events, spaceOf, remove: removeMock };
      };

      /** Owns the dashboard in the default space, then returns what the next run needs. */
      const ownInDefault = async (remove?: jest.Mock) => {
        const setup = isolatedRegistry(remove);
        const ledger = createLedger();
        await runOwned({ registry: setup.registry, ledger, input: inSpace() });
        setup.events.length = 0;
        return { ...setup, ledger };
      };

      it('is deleted from the space it was declared in before, then created in the new one', async () => {
        const { registry, events, spaceOf, ledger } = await ownInDefault();
        const infoLogger = loggerMock.create();

        const outcome = await runOwned({
          registry,
          ledger,
          input: inSpace(['marketing']),
          runLogger: infoLogger,
        });

        expect(events).toEqual(['remove:default:overview', 'apply:marketing:overview']);
        expect(spaceOf.get('overview')).toBe('marketing');
        expect(ledger.entries.get(docId)).toMatchObject({ spaces: ['marketing'] });
        expect(outcome.status).toBe('completed');
        expect(outcome.kinds.dashboard).toEqual({
          applied: 1,
          created: 1,
          unchanged: 0,
          failed: 0,
        });
        expect(infoLogger.info).toHaveBeenCalledWith(
          'Deleted the dashboard resources "overview" from the space "default", since they are now declared in "marketing"'
        );
      });

      it.each([
        [
          'reports an error for it',
          jest.fn(async () => ({ removed: 0, errors: [{ id: 'overview', message: 'es down' }] })),
          {
            id: 'overview',
            message:
              'Could not delete the dashboard from the space "default" it was declared in before, so it is not moved: es down',
          },
        ],
        [
          'throws',
          jest.fn(async () => {
            throw new Error('es down');
          }),
          {
            message:
              'Could not delete the dashboard resources declared in the space "default" before, so they are not moved: es down',
          },
        ],
      ])(
        'is not created in the new space, stays owned and is retried when deleting it %s',
        async (_, remove, error) => {
          const { registry, events, spaceOf, ledger } = await ownInDefault(remove);

          const outcome = await runOwned({ registry, ledger, input: inSpace(['marketing']) });

          expect(events).toEqual(['remove:default:overview']);
          expect(spaceOf.get('overview')).toBe('default');
          expect(ledger.entries.get(docId)).toMatchObject({
            spaces: ['default'],
            appliedHash: expect.any(String),
          });
          expect(outcome).toMatchObject({
            status: 'failed',
            retryable: true,
            errors: [{ kind: 'dashboard', spaceId: 'marketing', ...error }],
          });
          expect(outcome.kinds.dashboard).toMatchObject({ applied: 0, failed: 1 });
        }
      );

      it('never deletes one the bootstrap does not own', async () => {
        const { registry, events, spaceOf, remove } = isolatedRegistry();
        spaceOf.set('overview', 'default');
        const ledger = createLedger();

        const outcome = await runOwned({ registry, ledger, input: inSpace(['marketing']) });

        expect(remove).not.toHaveBeenCalled();
        expect(events).toEqual(['apply:marketing:overview']);
        expect(spaceOf.get('overview')).toBe('default');
        expect(outcome.status).toBe('failed');
        expect(ledger.entries.size).toBe(0);
      });

      it('is deleted from the space it was declared in before even when its create was never confirmed, since its id is owned', async () => {
        const { registry, events, spaceOf, remove } = isolatedRegistry();
        const ledger = createLedger();
        // Owned before a create whose outcome was never recorded, for example a run that stopped.
        ledger.entries.set(docId, { kind: 'dashboard', id: 'overview', spaces: ['default'] });
        spaceOf.set('overview', 'default');

        const outcome = await runOwned({ registry, ledger, input: inSpace(['marketing']) });

        expect(remove).toHaveBeenCalledWith(
          expect.objectContaining({ spaceId: 'default', ids: ['overview'] })
        );
        expect(events).toEqual(['remove:default:overview', 'apply:marketing:overview']);
        expect(spaceOf.get('overview')).toBe('marketing');
        expect(ledger.entries.get(docId)).toMatchObject({
          spaces: ['marketing'],
          appliedHash: expect.any(String),
        });
        expect(outcome.status).toBe('completed');
      });
    });

    describe('after a Kibana upgrade', () => {
      const upgrade = async () => {
        const events: string[] = [];
        const stored: Record<string, StoredVersion> = {};
        const { registry } = ownedRegistry({ stored, events });
        const ledger = createLedger();
        await runOwned({ registry, ledger, kibanaVersion: '9.4.0' });
        // The upgrade's migrations rewrite the objects, keeping when they were last written.
        for (const id of Object.keys(stored)) {
          stored[id] = { ...stored[id], version: `${stored[id].version}-migrated` };
        }
        events.length = 0;
        return { events, stored, registry, ledger };
      };

      it('leaves an object only the migrations changed as it is', async () => {
        const { events, registry, ledger } = await upgrade();

        const outcome = await runOwned({ registry, ledger, kibanaVersion: '9.5.0' });

        expect(events).toEqual([]);
        expect(outcome.kinds.data_view).toMatchObject({ unchanged: 2 });
      });

      it('compares the stored version again on the runs after the first', async () => {
        const { events, stored, registry, ledger } = await upgrade();
        await runOwned({ registry, ledger, kibanaVersion: '9.5.0' });
        expect(ledger.entries.get(docIdOf('old'))).toMatchObject({
          objectVersion: stored.old.version,
          kibanaVersion: '9.5.0',
        });
        // Kibana rewrites the object without changing when it was last written.
        stored.old = { ...stored.old, version: 'references-removed' };

        await runOwned({ registry, ledger, kibanaVersion: '9.5.0' });

        expect(events).toEqual(['apply:old']);
      });

      it('still leaves the objects as they are when they cannot be recorded', async () => {
        const { events, registry, ledger } = await upgrade();
        ledger.put.mockImplementation(async (items) => {
          if (items.length > 0) {
            throw new Error('ledger down');
          }
        });

        const outcome = await runOwned({ registry, ledger, kibanaVersion: '9.5.0' });

        expect(events).toEqual([]);
        expect(outcome.status).not.toBe('failed');
        expect(outcome.errors).toEqual([]);
        expect(outcome.kinds.data_view).toMatchObject({ unchanged: 2 });
      });

      it('still reverts an object someone changed', async () => {
        const { events, stored, registry, ledger } = await upgrade();
        stored.old = { version: 'edited', updatedAt: 'edited' };

        await runOwned({ registry, ledger, kibanaVersion: '9.5.0' });

        expect(events).toEqual(['apply:old']);
        expect(ledger.entries.get(docIdOf('old'))).toMatchObject({ kibanaVersion: '9.5.0' });
      });
    });

    it('applies and owns nothing in a group whose objects cannot be read', async () => {
      const events: string[] = [];
      const versions = jest.fn(async () => {
        throw new Error('es down');
      });
      const { registry } = ownedRegistry({ stored: {}, events, versions });
      const ledger = createLedger();

      const outcome = await runOwned({ registry, ledger });

      expect(events).toEqual([]);
      expect(ledger.put).not.toHaveBeenCalled();
      expect(outcome.errors).toEqual([
        { kind: 'data_view', spaceId: 'default', message: 'es down' },
      ]);
      expect(outcome.retryable).toBe(true);
    });

    it('still reports invalid documents in a group whose objects cannot be read', async () => {
      const versions = jest.fn(async () => {
        throw new Error('es down');
      });
      const { registry } = ownedRegistry({ stored: {}, versions });
      const ledger = createLedger();

      const outcome = await runOwned({
        registry,
        ledger,
        input: {
          hash: 'h',
          groups: [group('data_view', [{ id: 'ok' }, 7, { id: 'a' }, { id: 'a' }])],
        },
      });

      expect(outcome.kinds.data_view).toMatchObject({ applied: 0, failed: 4 });
      expect(outcome.errors).toEqual([
        expect.objectContaining({
          message: expect.stringMatching(
            /^Invalid data_view resource in main\.data_view\.json entry 2: /
          ),
        }),
        expect.objectContaining({ id: 'a', message: expect.stringContaining('declare it once') }),
        expect.objectContaining({ id: 'a', message: expect.stringContaining('declare it once') }),
        { kind: 'data_view', spaceId: 'default', message: 'es down' },
      ]);
      expect(outcome.retryable).toBe(true);
    });

    it('reports what it wrote but could not record, and is retried', async () => {
      const { registry } = ownedRegistry({ stored: {} });
      const ledger = createLedger();
      ledger.put
        .mockImplementationOnce(async () => {})
        .mockRejectedValueOnce(new Error('ledger down'));

      const outcome = await runOwned({ registry, ledger });

      expect(outcome.errors).toEqual([
        expect.objectContaining({
          message: expect.stringMatching(
            /could not be recorded, so the next run writes them again: ledger down$/
          ),
        }),
      ]);
      expect(outcome.retryable).toBe(true);
      expect(outcome.kinds.data_view).toMatchObject({ applied: 2, created: 2 });
    });

    it('counts what it created itself, whatever the kind reports', async () => {
      const { registry } = ownedRegistry({
        stored: {},
        apply: async ({ resources }) => ({ applied: resources.length, created: 5, errors: [] }),
      });

      const outcome = await runOwned({ registry, ledger: createLedger() });

      expect(outcome.kinds.data_view).toMatchObject({ applied: 2, created: 2 });
    });

    it('lists every object the files declare, so pruning keeps them', async () => {
      const { registry } = ownedRegistry({ stored: { old: { version: 'mine' } } });

      const outcome = await runOwned({ registry, ledger: createLedger() });

      expect(outcome.declared).toEqual(new Set([docIdOf('old'), docIdOf('new')]));
    });

    describe('a kind not tied to a space', () => {
      const spaceDocIdOf = (id: string) => ledgerIdOf('space', id);

      /** A space kind whose objects live in `stored`, owned without `remove`. */
      const spaceRegistry = (stored: Record<string, StoredVersion>, events: string[] = []) => {
        const registry = new ResourceKindRegistry();
        registry.register({
          id: 'space',
          spaces: 'none',
          parse: (document) => documentWithId.validate(document),
          idOf: ({ id }) => id,
          apply: async (context) => {
            const { resources } = context;
            const space = 'spaceId' in context ? 'a space' : 'no space';
            events.push(`apply:${space}:${resources.map(({ id }) => id).join(',')}`);
            resources.forEach(({ id }) => {
              stored[id] = { version: `v-${id}` };
            });
            return { applied: resources.length, errors: [] };
          },
          ownership: {
            versions: async ({ spaceId, ids }) => {
              events.push(`versions:${spaceId}`);
              return Object.fromEntries(
                ids.flatMap((id) => (stored[id] ? [[id, stored[id]]] : []))
              );
            },
          },
        });
        return registry;
      };

      const declaredSpaces: BootstrapInput = {
        hash: 'h',
        groups: [group('space', [{ id: 'team' }])],
      };

      it('owns what it creates, for no space, then leaves it as it is', async () => {
        const events: string[] = [];
        const registry = spaceRegistry({}, events);
        const ledger = createLedger();

        await runOwned({ registry, ledger, input: declaredSpaces });
        const outcome = await runOwned({ registry, ledger, input: declaredSpaces });

        expect(events).toEqual([
          'versions:default',
          'apply:no space:team',
          'versions:default',
          'versions:default',
        ]);
        expect(ledger.entries.get(spaceDocIdOf('team'))).toMatchObject({
          kind: 'space',
          id: 'team',
          spaces: [],
          objectVersion: 'v-team',
        });
        expect(outcome.kinds.space).toEqual({ applied: 0, created: 0, unchanged: 1, failed: 0 });
        expect(outcome.declared).toEqual(new Set([spaceDocIdOf('team')]));
      });

      it('never takes over an object that exists but that the bootstrap did not create', async () => {
        const events: string[] = [];
        const registry = spaceRegistry({ team: { version: 'by-hand' } }, events);
        const ledger = createLedger();

        const outcome = await runOwned({ registry, ledger, input: declaredSpaces });

        expect(events).toEqual(['versions:default']);
        expect(ledger.entries.has(spaceDocIdOf('team'))).toBe(false);
        expect(outcome.errors).toEqual([
          {
            kind: 'space',
            id: 'team',
            message:
              'The space "team" already exists and the bootstrap did not create it, so it is not applied. Delete it, or declare it with another id',
          },
        ]);
        expect(outcome.retryable).toBe(false);
      });
    });

    describe('a kind without ownership', () => {
      it('is written every run and never recorded', async () => {
        const registry = new ResourceKindRegistry();
        registerKind(registry, 'setting', [], undefined, 'none');
        const ledger = createLedger();
        const input = { hash: 'h', groups: [group('setting', [{ id: 'a' }])] };

        await runOwned({ registry, ledger, input });
        const outcome = await runOwned({ registry, ledger, input });

        expect(calls).toEqual(['setting:no space:1', 'setting:no space:1']);
        expect(ledger.put).not.toHaveBeenCalled();
        expect(outcome.declared.size).toBe(0);
      });

      it('counts what the kind reports as created', async () => {
        const registry = new ResourceKindRegistry();
        registerKind(
          registry,
          'setting',
          [],
          async () => ({ applied: 2, created: 1, errors: [] }),
          'none'
        );

        const outcome = await runOwned({
          registry,
          ledger: createLedger(),
          input: { hash: 'h', groups: [group('setting', [{ id: 'a' }, { id: 'b' }])] },
        });

        expect(outcome.kinds.setting).toEqual({ applied: 2, created: 1, unchanged: 0, failed: 0 });
      });
    });
  });
});
